import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

test.beforeAll(async () => {
  await mkdir('../.tmp/header-design', { recursive: true })
  await mkdir('../.tmp/agent-work/profile-menu', { recursive: true })
})

test('round navigation is translated before any board bundle is loaded', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
  await page.route(
    (url) => url.pathname === '/auth/me' || url.pathname.startsWith('/api/'),
    (route) =>
      route.fulfill(
        new URL(route.request().url()).pathname === '/auth/me'
          ? {
              json: {
                userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
                displayName: 'Охотник',
                roles: ['viewer'],
              },
            }
          : { status: 204 },
      ),
  )
  await page.goto('/panel/game-application')
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Текущий раунд', exact: true }),
  ).toHaveAttribute('href', '/panel/game-round')
})

for (const width of [320, 390, 768, 1200, 1440, 1920]) {
  test(`header navigation stays usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
    await page.route(
      (url) => url.pathname === '/auth/me' || url.pathname.startsWith('/api/'),
      async (route) => {
        const path = new URL(route.request().url()).pathname
        await route.fulfill(
          path === '/auth/me'
            ? {
                json: {
                  userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
                  displayName: 'EdiLarios',
                  roles: ['admin', 'viewer'],
                },
              }
            : { status: 204 },
        )
      },
    )
    await page.goto('/panel/game-board')
    const header = page.getByRole('banner')
    await expect(header).toBeVisible()
    const compact = width < 1200
    if (!compact) {
      const navigation = header.getByRole('navigation', { name: 'Основная навигация' })
      const navigationBox = await navigation.boundingBox()
      expect(Math.abs(navigationBox!.x + navigationBox!.width / 2 - width / 2)).toBeLessThan(1)
      await expect(navigation.getByRole('link').nth(0)).toHaveText('Доска')
      await expect(navigation.getByRole('link').nth(1)).toHaveText('Текущий раунд')
    }
    const headerBox = await header.boundingBox()
    expect(headerBox?.height).toBeLessThanOrEqual(compact ? 51 : 59)
    const controls = header.locator('a:visible, button:visible')
    const boxes = await controls.evaluateAll((elements) =>
      elements.map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect()
        return { x, y, width, height }
      }),
    )
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
    for (let index = 1; index < boxes.length; index++) {
      expect(boxes[index].x).toBeGreaterThanOrEqual(boxes[index - 1].x + boxes[index - 1].width - 1)
    }
    await expect(page.getByText('Игровое поле сейчас недоступно.')).toBeVisible()
    await header.screenshot({
      path: `../.tmp/header-design/header-${width}.png`,
      animations: 'disabled',
    })
    const trigger = header.getByRole('button', {
      name: compact ? 'Открыть навигацию' : 'История',
      exact: true,
    })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const history = page.getByRole('menuitem', { name: 'История игр', exact: true })
    await expect(history).toBeVisible()
    await expect(page.locator('.MuiMenu-paper')).toHaveCSS('transform', 'none')
    const itemHeights = await page
      .getByRole('menuitem')
      .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height))
    const coarsePointer = await page.evaluate(() => matchMedia('(pointer: coarse)').matches)
    for (const height of itemHeights) expect(height).toBeGreaterThanOrEqual(coarsePointer ? 44 : 28)
    await page.getByRole('menu').screenshot({
      path: `../.tmp/header-design/history-${width}.png`,
      animations: 'disabled',
    })
    if (compact) {
      await expect(page.getByRole('menuitem', { name: 'Доска', exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      )
      await expect(page.getByRole('menuitem').nth(1)).toHaveText('Текущий раунд')
      await page.screenshot({
        path: `../.tmp/header-design/menu-${width}.png`,
        animations: 'disabled',
      })
    }
    await history.click()
    await expect(page).toHaveURL(/\/panel\/game-history$/)
    await expect(page.getByRole('menu')).toHaveCount(0)
    if (compact) await expect(trigger).toContainText('История игр')
    await trigger.click()
    await expect(history).toHaveAttribute('aria-current', 'page')
    await expect(history).toBeFocused()
    await page.getByRole('menu').screenshot({
      path: `../.tmp/header-design/history-active-${width}.png`,
      animations: 'disabled',
    })
    await page.keyboard.press('ArrowDown')
    await expect(
      page.getByRole('menuitem', { name: 'История модификаторов', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await header.getByRole('button', { name: 'Администрирование', exact: true }).click()
    await expect(page.getByRole('menuitem', { name: 'Команды', exact: true })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Настройка доски', exact: true })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitem', { name: 'Команды', exact: true })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(
      page.getByRole('menuitem', { name: 'Каталог модификаторов', exact: true }),
    ).toBeFocused()
    await page.getByRole('menu').screenshot({
      path: `../.tmp/header-design/administration-${width}.png`,
      animations: 'disabled',
    })
    await page.keyboard.press('Escape')
    await expect(
      header.getByRole('button', { name: 'Администрирование', exact: true }),
    ).toBeFocused()
    await header.getByRole('button', { name: 'Открыть уведомления' }).click()
    const notificationBox = await page.getByRole('menu').boundingBox()
    expect(notificationBox!.x).toBeGreaterThanOrEqual(0)
    expect(notificationBox!.x + notificationBox!.width).toBeLessThanOrEqual(width)
    await page.keyboard.press('Escape')
    const profileTrigger = header.getByRole('button', { name: 'EdiLarios', exact: true })
    await profileTrigger.click()
    const profile = page.getByRole('dialog', { name: 'Профиль', exact: true })
    await expect(profile.getByRole('button', { name: 'Выйти' })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await profile.screenshot({
      path: `../.tmp/agent-work/profile-menu/profile-${width}.png`,
      animations: 'disabled',
    })
    await page.keyboard.press('Tab')
    await expect(profile.getByRole('combobox', { name: 'Язык интерфейса' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(profile.getByRole('button', { name: 'Выйти' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(profile.getByRole('combobox', { name: 'Язык интерфейса' })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(profile.getByRole('button', { name: 'Выйти' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(profileTrigger).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

for (const locale of [
  { code: 'ru', profile: 'Профиль', language: 'Язык интерфейса', logout: 'Выйти' },
  { code: 'en', profile: 'Profile', language: 'Interface language', logout: 'Log out' },
  { code: 'uk', profile: 'Профіль', language: 'Мова інтерфейсу', logout: 'Вийти' },
  { code: 'pl', profile: 'Profil', language: 'Język interfejsu', logout: 'Wyloguj się' },
]) {
  test(`profile settings handle a long nickname and language changes in ${locale.code}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.addInitScript((code) => localStorage.setItem('i18nextLng', code), locale.code)
    const displayName = 'Охотник_с_очень_длинным_именем_DeadMans1896'
    let loggedOut = false
    await page.route(
      (url) => url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/'),
      async (route) => {
        const path = new URL(route.request().url()).pathname
        if (path === '/auth/logout') loggedOut = true
        await route.fulfill(
          path === '/auth/me' && !loggedOut
            ? {
                json: {
                  userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
                  displayName,
                  roles: ['superadmin', 'admin', 'moderator', 'viewer'],
                },
              }
            : { status: 204 },
        )
      },
    )
    await page.goto('/panel/game-board')
    const trigger = page.getByRole('banner').getByRole('button', { name: displayName, exact: true })
    await trigger.click()
    const profile = page.getByRole('dialog', { name: locale.profile, exact: true })
    await expect(profile.getByText(displayName, { exact: true })).toBeVisible()
    const bounds = await profile.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320)
    expect(await profile.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    )
    await page.evaluate(() => document.fonts.ready)
    await profile.screenshot({
      path: `../.tmp/agent-work/profile-menu/profile-long-${locale.code}.png`,
      animations: 'disabled',
    })
    const language = profile.getByRole('combobox', { name: locale.language })
    await language.focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Profile', exact: true })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('combobox', { name: 'Interface language' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await trigger.click()
    await page.getByRole('dialog').getByRole('button', { name: 'Log out', exact: true }).click()
    await expect(page).toHaveURL(/\/$/)
    expect(loggedOut).toBe(true)
  })
}

for (const locale of [
  {
    code: 'en',
    navigation: 'Open navigation',
    history: 'Modifier history',
    admin: 'Administration',
    system: 'System',
    roles: 'User roles',
  },
  {
    code: 'ru',
    navigation: 'Открыть навигацию',
    history: 'История модификаторов',
    admin: 'Администрирование',
    system: 'Система',
    roles: 'Роли пользователей',
  },
  {
    code: 'uk',
    navigation: 'Відкрити навігацію',
    history: 'Історія модифікаторів',
    admin: 'Адміністрування',
    system: 'Система',
    roles: 'Ролі користувачів',
  },
  {
    code: 'pl',
    navigation: 'Otwórz nawigację',
    history: 'Historia modyfikatorów',
    admin: 'Administracja',
    system: 'System',
    roles: 'Role użytkowników',
  },
]) {
  test(`navigation dropdowns preserve groups and fit a short screen in ${locale.code}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.addInitScript((code) => localStorage.setItem('i18nextLng', code), locale.code)
    await page.route(
      (url) => url.pathname === '/auth/me' || url.pathname.startsWith('/api/'),
      (route) =>
        route.fulfill(
          new URL(route.request().url()).pathname === '/auth/me'
            ? {
                json: {
                  userId: 'c592262f-8e49-466d-a4fc-2de69ba46771',
                  displayName: 'Admin',
                  roles: ['superadmin', 'viewer'],
                },
              }
            : { status: 204 },
        ),
    )
    await page.goto('/panel/game-board')
    const header = page.getByRole('banner')
    await header.getByRole('button', { name: locale.navigation, exact: true }).click()
    await expect(page.getByRole('menuitem', { name: locale.history, exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    const admin = header.getByRole('button', { name: locale.admin, exact: true })
    await admin.click()
    const menu = page.getByRole('menu')
    await expect(menu.getByText(locale.system, { exact: true })).toBeVisible()
    const bounds = (await menu.boundingBox())!
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(568)
    expect(await menu.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    await page.keyboard.press('End')
    await expect(menu.getByRole('menuitem', { name: locale.roles, exact: true })).toBeFocused()
    await menu.screenshot({
      path: `../.tmp/header-design/admin-short-${locale.code}.png`,
      animations: 'disabled',
    })
    await page.keyboard.press('Escape')
    await expect(admin).toBeFocused()
  })
}
