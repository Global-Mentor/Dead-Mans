import { expect, test, type Page } from '@playwright/test'
import { expectUnifiedTypography } from './typography-assertions.ts'

test.afterEach(async ({ page }) => {
  await expectUnifiedTypography(page)
})

interface MockSession {
  userId: string
  displayName: string
  roles: string[]
}

async function mockBackend(page: Page, session: MockSession | null | (() => MockSession | null)) {
  await page.route(
    (url) => url.pathname === '/auth/me' || url.pathname.startsWith('/api/'),
    async (route) => {
      const requestUrl = new URL(route.request().url())

      if (requestUrl.pathname === '/auth/me') {
        const currentSession = typeof session === 'function' ? session() : session
        if (currentSession === null) {
          await route.fulfill({ status: 204 })
          return
        }

        await route.fulfill({ status: 200, json: currentSession })
        return
      }

      await route.fulfill({ status: 204 })
    },
  )
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error
  })
  await page.addInitScript(() => window.localStorage.setItem('i18nextLng', 'en'))
})

test('redirects an anonymous visitor from the panel to sign in', async ({ page }) => {
  await mockBackend(page, null)

  await page.goto('/panel/game-board')

  await expect(page).toHaveURL('/?returnTo=%2Fpanel%2Fgame-board')
  await expect(page.getByRole('button', { name: /twitch/i })).toBeVisible()
})

const viewer: MockSession = {
  userId: 'c541269c-cb41-4e6c-9004-73d3f0b2ab93',
  displayName: 'Viewer',
  roles: ['viewer'],
}

async function mockTwitchLogin(page: Page, complete: () => string) {
  await page.route('**/auth/twitch/login', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<meta http-equiv="refresh" content="0;url=https://oauth.test/authorize">',
    }),
  )
  await page.route('https://oauth.test/authorize', (route) =>
    route.fulfill({
      status: 302,
      headers: { location: `http://localhost:5180/auth/callback?${complete()}` },
    }),
  )
}

for (const width of [390, 768, 1440]) {
  test(`returns to the shared guide and section after login at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    let session: MockSession | null = null
    await mockBackend(page, () => session)
    await mockTwitchLogin(page, () => {
      session = viewer
      return 'status=authenticated'
    })
    const destination = '/panel/game-guide?from=shared#score'
    await page.goto(destination)
    await expect(page.getByRole('button', { name: 'Sign in with Twitch' })).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: 'Sign in with Twitch' }).click()

    await expect(page).toHaveURL(destination)
    await expect(
      page.getByRole('heading', { name: 'How to play Dead Mans', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Points and the team result', exact: true }),
    ).toBeInViewport()
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: info.outputPath('guide-after-login.png'),
      animations: 'disabled',
    })
    expect(await page.evaluate(() => sessionStorage.getItem('dm_login_return_to'))).toBeNull()
  })
}

test('keeps a fragment inherited from the production sign-in redirect', async ({ page }) => {
  let session: MockSession | null = null
  await mockBackend(page, () => session)
  await mockTwitchLogin(page, () => {
    session = viewer
    return 'status=authenticated'
  })
  const destination = '/panel/game-guide?from=shared'
  await page.route(
    '**/panel/game-guide?from=shared',
    async (route) => {
      await route.fulfill({
        status: 302,
        headers: { location: `/?returnTo=${encodeURIComponent(destination)}` },
      })
    },
    { times: 1 },
  )
  await page.goto(`${destination}#quiz`)
  await expect(page).toHaveURL(`/?returnTo=${encodeURIComponent(destination)}#quiz`)
  await page.getByRole('button', { name: 'Sign in with Twitch' }).click()
  await expect(page).toHaveURL(`${destination}#quiz`)
  await expect(
    page.getByRole('heading', { name: 'How the quiz works', exact: true }),
  ).toBeInViewport()
})

for (const failure of ['provider-denied', 'session-unavailable'] as const) {
  test(`keeps the destination when retrying after ${failure}`, async ({ page }) => {
    let session: MockSession | null = null
    let attempt = 0
    await mockBackend(page, () => session)
    await mockTwitchLogin(page, () => {
      attempt += 1
      if (attempt === 1) {
        return failure === 'provider-denied'
          ? 'status=error&reason=access_denied'
          : 'status=authenticated'
      }
      session = viewer
      return 'status=authenticated'
    })
    const destination = '/panel/game-guide#modifiers'
    await page.goto(destination)
    await page.getByRole('button', { name: 'Sign in with Twitch' }).click()
    await page.getByRole('button', { name: 'Back to sign-in' }).click()
    await page.getByRole('button', { name: 'Sign in with Twitch' }).click()
    await expect(page).toHaveURL(destination)
    await expect(
      page.getByRole('heading', { name: 'How modifiers work', exact: true }),
    ).toBeVisible()
  })
}

test('uses the shared destination when the visitor is already signed in', async ({ page }) => {
  await mockBackend(page, viewer)
  await page.goto('/?returnTo=%2Fpanel%2Fgame-guide%23faq')
  await expect(page).toHaveURL('/panel/game-guide#faq')
  await expect(page.getByRole('heading', { name: 'Common questions', exact: true })).toBeVisible()
})

test('still checks route permissions after login', async ({ page }) => {
  let session: MockSession | null = null
  await mockBackend(page, () => session)
  await mockTwitchLogin(page, () => {
    session = viewer
    return 'status=authenticated'
  })
  await page.goto('/panel/game-setup')
  await page.getByRole('button', { name: 'Sign in with Twitch' }).click()
  await expect(page).toHaveURL('/panel/game-board')
  await expect(page.getByRole('heading', { name: /game board/i })).toBeVisible()
})

test('ignores an external return URL and clears an abandoned target on direct login', async ({
  page,
}) => {
  let session: MockSession | null = null
  await mockBackend(page, () => session)
  await mockTwitchLogin(page, () => {
    session = viewer
    return 'status=authenticated'
  })
  await page.goto('/?returnTo=https%3A%2F%2Fattacker.test%2Fpanel%2Fgame-guide')
  await page.evaluate(() => sessionStorage.setItem('dm_login_return_to', '/panel/game-guide#score'))
  await page.getByRole('button', { name: 'Sign in with Twitch' }).click()
  await expect(page).toHaveURL('/panel/game-board')
  await expect(page.getByRole('heading', { name: /game board/i })).toBeVisible()
})

test('keeps login destinations separate between browser tabs', async ({ page, context }) => {
  const otherPage = await context.newPage()
  const flows = [
    { tab: page, destination: '/panel/game-guide#score' },
    { tab: otherPage, destination: '/panel/game-guide#quiz' },
  ]
  for (const { tab, destination } of flows) {
    await tab.addInitScript(() => localStorage.setItem('i18nextLng', 'en'))
    let session: MockSession | null = null
    let attempt = 0
    await mockBackend(tab, () => session)
    await mockTwitchLogin(tab, () => {
      attempt += 1
      if (attempt === 1) return 'status=error&reason=access_denied'
      session = viewer
      return 'status=authenticated'
    })
    await tab.goto(destination)
    await tab.getByRole('button', { name: 'Sign in with Twitch' }).click()
    await expect(tab.getByRole('button', { name: 'Back to sign-in' })).toBeVisible()
  }
  for (const { tab, destination } of flows) {
    await tab.getByRole('button', { name: 'Back to sign-in' }).click()
    await tab.getByRole('button', { name: 'Sign in with Twitch' }).click()
    await expect(tab).toHaveURL(destination)
  }
  for (const { tab, destination } of flows) await expect(tab).toHaveURL(destination)
  await otherPage.close()
})

test('redirects a viewer away from an admin-only route', async ({ page }) => {
  await mockBackend(page, {
    userId: 'c541269c-cb41-4e6c-9004-73d3f0b2ab93',
    displayName: 'Viewer',
    roles: ['viewer'],
  })

  await page.goto('/panel/game-setup')

  await expect(page).toHaveURL(/\/panel\/game-board$/)
  await expect(page.getByRole('heading', { name: /game board/i })).toBeVisible()
})

test('allows an administrator to open the question catalog', async ({ page }) => {
  await mockBackend(page, {
    userId: 'abf3680b-ac92-43ce-8c4f-c542f806e520',
    displayName: 'Administrator',
    roles: ['admin', 'viewer'],
  })

  await page.goto('/panel/catalog-questions')

  await expect(page).toHaveURL(/\/panel\/catalog-questions$/)
  await expect(page.getByRole('heading', { name: /question catalog/i })).toBeVisible()
})
