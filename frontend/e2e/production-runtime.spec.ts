import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { expect, test, type Page, type Route, type WebSocketRoute } from '@playwright/test'
import { expectUnifiedTypography } from './typography-assertions.ts'
import type {
  GameQuestionCatalogItem,
  UpdateGameQuestionRequest,
} from '../src/shared/api/contracts/index.ts'

test.afterEach(async ({ page }) => {
  await expectUnifiedTypography(page)
})

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

test('production entry point declares a bundled favicon', async ({ page }) => {
  await serveProductionApp(page, async (route) => route.fulfill({ status: 204 }))
  await page.goto(`${origin}/`)
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg')
  const icon = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!
    const response = await fetch(link.href)
    return {
      status: response.status,
      contentType: response.headers.get('content-type'),
      body: await response.text(),
    }
  })
  expect(icon.status).toBe(200)
  expect(icon.contentType).toBe('image/svg+xml')
  expect(icon.body).toContain('<svg')
})

test('catalog answer editing preserves variants and validates duplicates under production CSP', async ({
  page,
}) => {
  const failures: string[] = []
  page.on('pageerror', (error) => failures.push(error.message))
  const questionId = '80a7024d-1aef-46ae-9ca4-efb51db520a6'
  const categoryId = '098956eb-7adb-4f14-8300-7e846bf60747'
  let question: GameQuestionCatalogItem = {
    questionId,
    categoryId,
    questionCode: 'capital',
    categoryName: 'Geography',
    text: 'Capital?',
    options: [
      {
        optionId: '12300000-0000-4000-8000-000000000001',
        text: 'London',
        isCorrect: false,
        sortOrder: 0,
      },
      {
        optionId: '12300000-0000-4000-8000-000000000002',
        text: 'Paris',
        isCorrect: true,
        sortOrder: 1,
      },
    ],
    reward: 1,
    priority: 0,
    isEnabled: true,
    askedTotalCount: 0,
    submissionTotalCount: 0,
    correctSubmissionTotalCount: 0,
    correctPercentage: 0,
    lastAskedAtUtc: null,
  }
  const saved: unknown[] = []
  await serveProductionApp(page, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === '/api/game/questions/categories') {
      await route.fulfill({
        json: [{ id: categoryId, name: 'Geography', questionCount: 1, isProtected: false }],
      })
    } else if (path === '/api/game/questions/catalog') {
      await route.fulfill({ json: [question] })
    } else if (path === `/api/game/questions/${questionId}` && request.method() === 'PUT') {
      const body = request.postDataJSON() as UpdateGameQuestionRequest
      saved.push(body)
      question = {
        ...question,
        ...body,
        options: body.options.map((option, index) => ({
          ...option,
          optionId: `12300000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          sortOrder: index,
        })),
      }
      await route.fulfill({ json: question })
    } else {
      await route.fulfill({ status: 204 })
    }
  })
  await page.goto(`${origin}/panel/catalog-questions`)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('textbox', { name: 'Correct answer', exact: true })).toHaveValue(
    'Paris',
  )
  await expect(dialog.getByRole('radio')).toHaveCount(0)
  await expect(
    dialog.getByRole('textbox', { name: 'Incorrect option 1', exact: true }),
  ).toHaveValue('London')
  await dialog.getByRole('button', { name: 'Add option', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Incorrect option 2', exact: true }).fill(' paris ')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog.getByText('This answer variant is already added.')).toBeVisible()
  expect(saved).toHaveLength(0)
  await dialog.getByRole('textbox', { name: 'Incorrect option 2', exact: true }).fill('Berlin')
  await dialog.getByRole('button', { name: 'Remove incorrect option 1', exact: true }).click()
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(saved).toEqual([
    expect.objectContaining({
      options: [
        { text: 'Paris', isCorrect: true },
        { text: 'Berlin', isCorrect: false },
      ],
    }),
  ])
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: 'Correct answer', exact: true })).toHaveValue(
    'Paris',
  )
  await expect(
    dialog.getByRole('textbox', { name: 'Incorrect option 1', exact: true }),
  ).toHaveValue('Berlin')
  const longAnswer = 'a'.repeat(500)
  await dialog.getByRole('textbox', { name: 'Incorrect option 1', exact: true }).fill(longAnswer)
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  const answerChip = page.getByText(`Answer: ${longAnswer}`, { exact: true })
  await expect(answerChip).toBeVisible()
  expect(await answerChip.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect(failures).toEqual([])
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
