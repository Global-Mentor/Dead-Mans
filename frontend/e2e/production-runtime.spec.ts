import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { expect, test, type Page, type Route, type WebSocketRoute } from '@playwright/test'

const origin = 'https://deadmans.test'
const dist = resolve('dist')
const contentTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

// Exercise the built chunks with the actual server policy, including module evaluation
// order. The development server and jsdom do not enforce the production script policy.
async function serveProductionApp(page: Page, api: (route: Route) => Promise<void>) {
  const middleware = await readFile('../backend/Api/Http/SecurityHeadersMiddleware.cs', 'utf8')
  const policy = middleware.match(/FrontendContentSecurityPolicy\s*=\s*"([^"]+)"/)?.[1]
  expect(policy).toBeTruthy()
  await page.route(`${origin}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/me') {
      await route.fulfill({
        json: {
          userId: 'abf3680b-ac92-43ce-8c4f-c542f806e520',
          displayName: 'Administrator',
          roles: ['admin', 'viewer'],
        },
      })
    } else if (path.startsWith('/api/') || path.startsWith('/hubs/')) {
      await api(route)
    } else {
      const file = resolve(
        dist,
        path === '/' || path.startsWith('/panel/') ? 'index.html' : `.${path}`,
      )
      expect(file.startsWith(`${dist}${sep}`)).toBe(true)
      await route.fulfill({
        body: await readFile(file),
        contentType: contentTypes[extname(file)] ?? 'application/octet-stream',
        headers: { 'Content-Security-Policy': policy! },
      })
    }
  })
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('i18nextLng', 'en'))
})

test('production authentication and lazy form validation work under strict CSP', async ({
  page,
}) => {
  const violations: string[] = []
  const errors: string[] = []
  await page.exposeFunction('recordCspViolation', (directive: string) => violations.push(directive))
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      void (
        window as unknown as { recordCspViolation: (value: string) => Promise<void> }
      ).recordCspViolation(`${event.effectiveDirective}: ${event.blockedURI}`)
    })
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await serveProductionApp(page, async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/game/modifiers/catalog') {
      await route.fulfill({ json: [] })
    } else {
      await route.fulfill({ status: 204 })
    }
  })
  await page.goto(`${origin}/panel/catalog-modifiers`)
  await page.getByRole('button', { name: 'Add modifier', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('This field is required.').first()).toBeVisible()
  expect(errors).toEqual([])
  expect(violations).toEqual([])
})

test('a shared hub reconnects after an abnormal close and refreshes an empty board', async ({
  page,
}) => {
  const sockets: WebSocketRoute[] = []
  const failures: string[] = []
  let boardRequests = 0
  let published = false
  await page.routeWebSocket(`${origin.replace('https:', 'wss:')}/hubs/game-board*`, (socket) => {
    sockets.push(socket)
    socket.onMessage((message) => {
      if (String(message).includes('"protocol":"json"')) socket.send('{}\u001e')
    })
  })
  page.on('pageerror', (error) => failures.push(error.message))
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`)
  })
  await serveProductionApp(page, async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/hubs/game-board/negotiate') {
      await route.fulfill({
        json: {
          negotiateVersion: 1,
          connectionId: 'runtime-test',
          connectionToken: 'runtime-token',
          availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text'] }],
        },
      })
    } else if (path === '/api/game') {
      boardRequests += 1
      await route.fulfill(
        published
          ? {
              json: {
                gameId: '3f93a420-ef68-4cb0-9c39-5fa46c921001',
                title: 'Reconnected game',
                status: 'ready',
                version: 1,
                rows: 1,
                cols: 1,
                rowLabels: ['A'],
                colLabels: ['1'],
                cells: [],
              },
            }
          : { status: 204 },
      )
    } else if (path === '/api/game/team-queue') {
      await route.fulfill({
        json: { teams: [], summary: { totalTeams: 0, playedTeams: 0, remainingTeams: 0 } },
      })
    } else {
      await route.fulfill({ status: 204 })
    }
  })
  await page.goto(`${origin}/panel/game-board`)
  await expect(page.getByText('No current game board is available yet.')).toBeVisible()
  await expect.poll(() => sockets.length).toBe(1)
  const beforeReconnect = boardRequests
  published = true
  await sockets[0]!.close({ code: 1006 })
  await expect.poll(() => sockets.length).toBe(2)
  await expect.poll(() => boardRequests).toBeGreaterThan(beforeReconnect)
  await expect(page.getByText('No current game board is available yet.')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Reconnected game', exact: true })).toBeVisible()
  expect(failures).toEqual([])
})

test('production profile changelog is bundled and works under strict CSP', async ({ page }) => {
  const violations: string[] = []
  const errors: string[] = []
  const noteFileRequests: string[] = []
  await page.exposeFunction('recordCspViolation', (directive: string) => violations.push(directive))
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      void (
        window as unknown as { recordCspViolation: (value: string) => Promise<void> }
      ).recordCspViolation(`${event.effectiveDirective}: ${event.blockedURI}`)
    })
  })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (request.url().includes('dev-notes')) {
      noteFileRequests.push(request.url())
    }
  })
  await serveProductionApp(page, async (route) => {
    await route.fulfill({ status: 204 })
  })
  await page.goto(`${origin}/panel/game-board`)
  await page.getByRole('button', { name: /Administrator/ }).click()
  await page.getByRole('menuitem', { name: "What's new" }).click()

  const dialog = page.getByRole('dialog', { name: "What's new" })
  await expect(dialog).toBeVisible()
  const dialogText = await dialog.innerText()
  expect(dialogText.indexOf('Removing players from a team')).toBeGreaterThan(-1)
  expect(dialogText.indexOf('Removing players from a team')).toBeLessThan(
    dialogText.indexOf('Closed testing'),
  )
  expect(errors).toEqual([])
  expect(violations).toEqual([])
  expect(noteFileRequests).toEqual([])
})
