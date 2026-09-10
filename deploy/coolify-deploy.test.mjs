import assert from 'node:assert/strict'
import test from 'node:test'
import { deployProduction } from './coolify-deploy.mjs'

const config = {
  token: 'test-token', webhook: 'https://coolify.example.com/api/v1/deploy?uuid=app123&force=false',
  healthUrl: 'https://deadman.example.com/health/ready', image: 'ghcr.io/example/app',
  digest: `sha256:${'a'.repeat(64)}`, sha: 'b'.repeat(40),
}

function fixture({ status = 'finished', servedSha = config.sha, failTrigger = false } = {}) {
  const calls = []
  const application = { build_pack: 'dockerimage', docker_registry_image_name: config.image,
    docker_registry_image_tag: 'main' }
  return {
    calls,
    options: {
      sleep: async () => {}, attempts: 2,
      fetchImpl: async (url, options) => {
        calls.push({ url, options })
        assert.equal(options.redirect, 'error')
        if (url === config.healthUrl) {
          assert.equal(options.headers.Authorization, undefined)
          return new Response('Healthy', { headers: { 'X-Release-Sha': servedSha } })
        }
        assert.equal(options.headers.Authorization, `Bearer ${config.token}`)
        if (url.endsWith('/applications/app123')) {
          if (options.method === 'PATCH') Object.assign(application, JSON.parse(options.body))
          return Response.json(application)
        }
        if (url.endsWith('/deploy')) {
          assert.equal(application.docker_registry_image_tag, config.digest.replace(':', '-'))
          if (failTrigger) throw new Error('private network details and test-token')
          return Response.json({ deployments: [{ deployment_uuid: 'deploy123' }] })
        }
        if (url.endsWith('/deployments/deploy123')) return Response.json({ status })
        throw new Error('Unexpected request')
      },
    },
  }
}

test('pins the digest before deploying and verifies the release without sending credentials to health', async () => {
  const { options, calls } = fixture()
  await deployProduction(config, options)
  assert.equal(calls.filter(call => call.options.method === 'POST').length, 1)
})

test('rejects a healthy old release', async () => {
  const { options } = fixture({ servedSha: 'c'.repeat(40) })
  await assert.rejects(deployProduction(config, options), /expected release SHA/)
})

test('does not accept a failed deployment just because the old site is healthy', async () => {
  const { options, calls } = fixture({ status: 'failed' })
  await assert.rejects(deployProduction(config, options), /failed or was cancelled/)
  assert.equal(calls.some(call => call.url === config.healthUrl), false)
})

test('does not retry an ambiguous deployment trigger or expose its raw error', async () => {
  const { options, calls } = fixture({ failTrigger: true })
  await assert.rejects(deployProduction(config, options), error => {
    assert.match(error.message, /inspect Coolify before retrying/)
    assert.doesNotMatch(error.message, /test-token|private network/)
    return true
  })
  assert.equal(calls.filter(call => call.options.method === 'POST').length, 1)
})

test('times out queued deployments without checking the old site', async () => {
  const { options, calls } = fixture({ status: 'queued' })
  await assert.rejects(deployProduction(config, options), /Timed out/)
  assert.equal(calls.some(call => call.url === config.healthUrl), false)
})

test('rejects insecure URLs and broad deployment targets before any requests', async () => {
  for (const webhook of ['http://coolify.example.com/api/v1/deploy?uuid=app123',
    'https://coolify.example.com/api/v1/deploy?uuid=app123,app456',
    'https://coolify.example.com/api/v1/deploy?tag=production']) {
    const { options, calls } = fixture()
    await assert.rejects(deployProduction({ ...config, webhook }, options))
    assert.equal(calls.length, 0)
  }
})
