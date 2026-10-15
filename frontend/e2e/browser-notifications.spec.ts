import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { setupNotificationFixture } from './support/notification-fixture.ts'

type NotificationFailure = 'dismissed' | 'worker' | 'storage' | 'unsupported'

async function mockNotifications(
  page: Page,
  permission: NotificationPermission = 'default',
  failure?: NotificationFailure,
) {
  await page.addInitScript(
    ({ initialPermission, failure }) => {
      let permission = sessionStorage.getItem('permission-granted')
        ? ('granted' as const)
        : initialPermission
      Object.defineProperty(Notification, 'permission', {
        configurable: true,
        get: () => permission,
      })
      Notification.requestPermission = async () => {
        sessionStorage.setItem(
          'permissionRequests',
          String(Number(sessionStorage.getItem('permissionRequests') ?? 0) + 1),
        )
        permission = 'granted'
        sessionStorage.setItem('permission-granted', 'true')
        return permission
      }
      // Keep the real worker, Web Locks and browser focus checks; replace only OS display.
      ServiceWorkerRegistration.prototype.showNotification = async function (title, options) {
        const entries = JSON.parse(localStorage.getItem('test-notifications') ?? '[]') as unknown[]
        entries.push({ title, ...options })
        localStorage.setItem('test-notifications', JSON.stringify(entries))
      }
      if (failure === 'dismissed') Notification.requestPermission = async () => 'default'
      if (failure === 'worker')
        navigator.serviceWorker.register = async () => {
          throw new Error('Unavailable')
        }
      if (failure === 'unsupported') Reflect.deleteProperty(window, 'Notification')
      if (failure === 'storage') {
        const save = Storage.prototype.setItem
        Storage.prototype.setItem = function (key, value) {
          if (key.startsWith('deadmans:browser-notifications:'))
            throw new DOMException('Blocked', 'SecurityError')
          save.call(this, key, value)
        }
      }
    },
    { initialPermission: permission, failure },
  )
}

const notice = (id: string) => ({
  notificationId: id,
  type: 'team_member_transferred',
  createdAtUtc: new Date().toISOString(),
  teamName: 'Ночной дозор',
  previousTeamName: 'Охотники',
  teamSlotIndex: 2,
  previousTeamSlotIndex: 1,
})

for (const width of [390, 768, 1440]) {
  test(`profile settings opt-in and persisted opt-out at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockNotifications(page)
    await setupNotificationFixture(page)
    await page.goto('/panel/game-application')
    await page.getByRole('button', { name: 'Hunter', exact: true }).click()
    await page.getByRole('button', { name: 'Настройки', exact: true }).click()
    await expect(page).toHaveURL(/\/panel\/settings$/)
    await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible()
    const toggle = page.getByRole('switch', { name: 'Уведомления браузера' })
    await expect(toggle).not.toBeChecked()
    expect(await page.evaluate(() => sessionStorage.getItem('permissionRequests'))).toBeNull()
    await toggle.click()
    await expect(toggle).toBeChecked()
    expect(await page.evaluate(() => sessionStorage.getItem('permissionRequests'))).toBe('1')
    await page.reload()
    await expect(toggle).toBeChecked()
    expect(await page.evaluate(() => sessionStorage.getItem('permissionRequests'))).toBe('1')
    await page.evaluate(() => document.fonts.ready)
    await mkdir('../.tmp/agent-work/browser-notifications', { recursive: true })
    await page.screenshot({
      path: `../.tmp/agent-work/browser-notifications/settings-${width}.png`,
      animations: 'disabled',
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await toggle.click()
    await expect(toggle).not.toBeChecked()
    await page.reload()
    await expect(toggle).not.toBeChecked()
    expect(await page.evaluate(() => sessionStorage.getItem('permissionRequests'))).toBe('1')
  })
}

test('blocked permission explains recovery without requesting it again', async ({ page }) => {
  await mockNotifications(page, 'denied')
  await setupNotificationFixture(page)
  await page.goto('/panel/settings')
  await expect(page.getByRole('switch', { name: 'Уведомления браузера' })).toBeDisabled()
  await expect(page.getByText('Уведомления заблокированы.', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('permissionRequests'))).toBeNull()
})

for (const failure of ['dismissed', 'worker', 'storage', 'unsupported'] as const) {
  test(`settings handle ${failure} without silently enabling notifications`, async ({ page }) => {
    await mockNotifications(page, 'default', failure)
    await setupNotificationFixture(page)
    await page.goto('/panel/settings')
    const toggle = page.getByRole('switch', { name: 'Уведомления браузера' })
    if (failure === 'unsupported') await expect(toggle).toBeDisabled()
    else await toggle.click()
    const message = {
      dismissed: 'Разрешение не получено.',
      worker: 'Не удалось включить уведомления браузера.',
      storage: 'Не удалось сохранить настройку в этом браузере.',
      unsupported: 'Уведомления браузера здесь недоступны.',
    }[failure]
    await expect(page.getByText(message, { exact: false })).toBeVisible()
    await expect(toggle).not.toBeChecked()
  })
}

test('one background notification across tabs, no replay, no notification read side effect', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['notifications'])
  await mockNotifications(page, 'granted')
  const first = await setupNotificationFixture(page)
  first.notifications = [notice('old')]
  await page.goto('/panel/settings')
  await page.getByRole('switch', { name: 'Уведомления браузера' }).click()
  await expect.poll(() => first.reads).toBeGreaterThan(1)
  const secondPage = await context.newPage()
  await mockNotifications(secondPage, 'granted')
  const second = await setupNotificationFixture(secondPage)
  second.notifications = [notice('old')]
  await secondPage.goto('/panel/settings')
  await expect(secondPage.getByRole('switch', { name: 'Уведомления браузера' })).toBeChecked()
  await expect.poll(() => second.reads).toBeGreaterThan(1)
  const readShown = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('test-notifications') ?? '[]') as {
          title: string
          body: string
          data: { path: string }
        }[],
    )
  expect(await readShown()).toEqual([])

  // With either application tab in front, neither tab should duplicate the bell.
  await secondPage.bringToFront()
  first.notifications = second.notifications = [notice('old'), notice('foreground')]
  await Promise.all([first.emit(), second.emit()])
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem('deadmans:notification-receipts:a518e557-2910-4111-97fb-86eb7a079101'),
      ),
    )
    .toContain('foreground')
  expect(await readShown()).toEqual([])

  const elsewhere = await context.newPage()
  await elsewhere.goto('about:blank')
  await elsewhere.bringToFront()
  // Headless Chrome reports every WindowClient as focused. Emulate only those
  // browser visibility flags; keep real service-worker messaging and tab locks.
  await context.serviceWorkers()[0]?.evaluate(() => {
    const scope = globalThis as unknown as {
      clients: {
        matchAll: (
          options: object,
        ) => Promise<{ url: string; focused: boolean; visibilityState: string }[]>
      }
    }
    const matchAll = scope.clients.matchAll.bind(scope.clients)
    scope.clients.matchAll = async (options) =>
      (await matchAll(options)).map((client) => ({
        url: client.url,
        focused: false,
        visibilityState: 'hidden',
      }))
  })
  first.notifications = second.notifications = [
    notice('old'),
    notice('foreground'),
    notice('background'),
  ]
  await Promise.all([first.emit(), second.emit()])
  await expect.poll(readShown).toHaveLength(1)
  const shown = (await readShown())[0]
  expect(shown?.title).toBe('Вы переведены в другую команду')
  expect(shown?.body).toBe(
    'Организатор перевёл вас из команды «Охотники» в команду «Ночной дозор».',
  )
  expect(shown?.data.path).toBe('/panel/game-application')
  expect(first.notifications).toHaveLength(3)
  expect(second.notifications).toHaveLength(3)
  await Promise.all([first.emit(), second.emit()])
  expect(await readShown()).toHaveLength(1)

  await secondPage.bringToFront()
  await secondPage.getByRole('switch', { name: 'Уведомления браузера' }).click()
  await expect(page.getByRole('switch', { name: 'Уведомления браузера' })).not.toBeChecked()
  await elsewhere.bringToFront()
  first.notifications = second.notifications = [...first.notifications, notice('disabled')]
  await Promise.all([first.emit(), second.emit()])
  expect(await readShown()).toHaveLength(1)
})
