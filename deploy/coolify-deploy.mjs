import { pathToFileURL } from 'node:url'

function httpsUrl(value, label) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${label} must be an HTTPS URL.`)
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error(`${label} must be an HTTPS URL without credentials or fragment.`)
  }
  return url
}

export async function deployProduction(config, {
  fetchImpl = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  attempts = 90,
} = {}) {
  const { token, image, digest, sha } = config
  if (!token || !/^ghcr\.io\/[a-z0-9._/-]+$/.test(image ?? '')
    || !/^sha256:[a-f0-9]{64}$/.test(digest ?? '') || !/^[a-f0-9]{40}$/.test(sha ?? '')) {
    throw new Error('Missing token or invalid image, digest, or commit SHA.')
  }
  const webhook = httpsUrl(config.webhook, 'COOLIFY_WEBHOOK')
  const healthUrl = httpsUrl(config.healthUrl, 'PRODUCTION_HEALTH_URL')
  const uuids = webhook.searchParams.getAll('uuid')
  if (webhook.pathname !== '/api/v1/deploy' || uuids.length !== 1
    || !/^[a-zA-Z0-9_-]+$/.test(uuids[0])
    || [...webhook.searchParams.keys()].some(key => !['uuid', 'force'].includes(key))) {
    throw new Error('COOLIFY_WEBHOOK must target exactly one application UUID, without tags or previews.')
  }
  const apiOrigin = webhook.origin
  const appPath = `/api/v1/applications/${uuids[0]}`
  const imageTag = digest.replace('sha256:', 'sha256-')

  async function request(url, options = {}) {
    // Do not print response bodies, tokens, URLs, or raw network exceptions.
    try {
      return await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(15_000) })
    } catch {
      throw new Error('Deployment request failed or timed out; inspect Coolify before retrying.')
    }
  }

  async function api(path, method = 'GET', body) {
    const response = await request(`${apiOrigin}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) throw new Error(`Coolify API returned HTTP ${response.status}.`)
    try {
      return await response.json()
    } catch {
      throw new Error('Coolify API returned invalid JSON.')
    }
  }

  const application = await api(appPath)
  if (application.build_pack !== 'dockerimage' || application.docker_registry_image_name !== image) {
    throw new Error('Coolify application must be a Docker Image resource using the expected repository.')
  }
  await api(appPath, 'PATCH', { docker_registry_image_tag: imageTag })
  const pinned = await api(appPath)
  if (pinned.docker_registry_image_tag !== imageTag) {
    throw new Error('Coolify did not save the immutable image digest.')
  }

  // Trigger once: retrying an ambiguous request could queue duplicate deployments.
  const started = await api('/api/v1/deploy', 'POST', { uuid: uuids[0], force: false })
  const deployments = started.deployments
  if (!Array.isArray(deployments) || deployments.length !== 1
    || !/^[a-zA-Z0-9_-]+$/.test(deployments[0].deployment_uuid ?? '')) {
    throw new Error('Coolify did not return exactly one deployment; inspect its queue before retrying.')
  }
  const deploymentId = deployments[0].deployment_uuid
  let finished = false
  for (let attempt = 0; attempt < attempts; attempt++) {
    const deployment = await api(`/api/v1/deployments/${deploymentId}`)
    if (deployment.status === 'finished') {
      finished = true
      break
    }
    if (/^(failed|cancelled|error)/.test(deployment.status ?? '')) {
      throw new Error('Coolify deployment failed or was cancelled.')
    }
    await sleep(10_000)
  }
  if (!finished) throw new Error('Timed out waiting for Coolify deployment.')

  for (let attempt = 0; attempt < 12; attempt++) {
    const response = await request(healthUrl.href, { headers: { 'Cache-Control': 'no-cache' } })
    if (response.status === 200 && response.headers.get('x-release-sha') === sha
      && (await response.text()).trim() === 'Healthy') {
      const current = await api(appPath)
      if (current.docker_registry_image_tag !== imageTag) {
        throw new Error('Coolify image configuration changed during deployment.')
      }
      return
    }
    await sleep(5_000)
  }
  throw new Error('Production did not return Healthy with the expected release SHA.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  deployProduction({
    token: process.env.COOLIFY_TOKEN,
    webhook: process.env.COOLIFY_WEBHOOK,
    healthUrl: process.env.PRODUCTION_HEALTH_URL,
    image: process.env.IMAGE,
    digest: process.env.IMAGE_DIGEST,
    sha: process.env.GITHUB_SHA,
  }).then(() => console.log('Production is healthy and serves the requested release.'))
    .catch(error => {
      console.error(error.message)
      process.exitCode = 1
    })
}
