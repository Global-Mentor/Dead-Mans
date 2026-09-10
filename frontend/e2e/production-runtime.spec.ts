import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { expect, test, type Page, type Route } from '@playwright/test'

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
