import { expect, test, type Page, type WebSocketRoute } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { expectUnifiedTypography } from './typography-assertions.ts'
import type {
  GameRegistrationSnapshot,
  RegistrationTeam,
} from '../src/shared/api/contracts/index.ts'

test.beforeAll(async () => {
  await mkdir('../.tmp/ui-audit/after', { recursive: true })
})

async function expectValidFormLabels(page: Page) {
  const invalidLabels = await page
    .locator('label[for]')
    .evaluateAll((labels) =>
      labels
        .filter((label) => !(label as HTMLLabelElement).control)
        .map((label) => ({ text: label.textContent, for: label.getAttribute('for') })),
    )
  expect(invalidLabels).toEqual([])
}

for (const viewport of [
  { width: 1440, height: 1000, suffix: '1440' },
  { width: 390, height: 1000, suffix: '390' },
  { width: 320, height: 700, suffix: '320' },
  { width: 390, height: 600, suffix: '390-short' },
]) {
  test(`application updates live and confirms disband requests at ${viewport.suffix}`, async ({
    page,
  }) => {
    const { width, height, suffix } = viewport
    await page.setViewportSize({ width, height })
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
    const userId = 'a518e557-2910-4111-97fb-86eb7a079101'
    const mine: RegistrationTeam = {
      teamId: 'mine',
      name: 'Ночной дозор',
      teamSlotIndex: 1,
      teamSlotType: 'public',
      recruitmentOpen: true,
      status: 'forming',
      isPlayed: false,
      isActiveInGame: false,
      isReady: false,
      members: [
        {
          player: { userId, login: 'raven', displayName: 'Ворон' },
          joinedAtUtc: '2026-09-13T00:00:00Z',
        },
      ],
      pendingInvitations: [],
    }
    const state: GameRegistrationSnapshot = {
      gameId: 'game',
      gameStatus: 'ready',
      minPlayersPerTeam: 1,
      maxPlayersPerTeam: 2,
      teamSlots: [],
      teams: [
        mine,
        {
          ...mine,
          teamId: 'ready',
          name: 'Чёрные вороны',
          teamSlotIndex: 2,
          status: 'confirmed',
          members: [
            {
              player: { userId: 'hunter', login: 'hunter', displayName: 'Скиталец' },
              joinedAtUtc: '2026-09-13T00:00:00Z',
            },
          ],
        },
        {
          ...mine,
          teamId: 'closed',
          name: 'Тихая охота',
          teamSlotIndex: 3,
          recruitmentOpen: false,
          members: [],
        },
      ],
      myTeam: mine,
      myPendingInvitations: [],
      myOutgoingInvitations: [],
      canInvitePlayersToMyTeam: false,
      invitablePlayers: [],
    }
    state.myTeam = null
    state.teams.shift()
    state.teamSlots = [
      { teamSlotId: 'slot', teamSlotIndex: 1, teamSlotType: 'public', isAvailableForNewTeam: true },
    ]
    let creates = 0
    let socket: WebSocketRoute | undefined
    let handshaken = false
    let posts = 0
    let deletes = 0
    const readinessUpdates: boolean[] = []
    await page.routeWebSocket(/\/hubs\/game-board(?:\?|$)/, (ws) => {
      socket = ws
      ws.onMessage((message) => {
        if (message.toString().includes('"protocol"')) {
          ws.send('{}\u001e')
          handshaken = true
        }
      })
    })
    await page.route(
      (url) =>
        url.pathname === '/auth/me' ||
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/hubs/'),
      async (route) => {
        const path = new URL(route.request().url()).pathname
        if (path === '/auth/me')
          return route.fulfill({ json: { userId, displayName: 'Ворон', roles: ['viewer'] } })
        if (path.endsWith('/negotiate'))
          return route.fulfill({
            json: {
              negotiateVersion: 1,
              connectionId: 'local-test',
              connectionToken: 'local-test',
              availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text'] }],
            },
          })
        if (path === '/api/game')
          return route.fulfill({
            json: {
              gameId: 'game',
              title: 'Тестовая игра',
              status: state.gameStatus,
              version: 1,
              rows: 1,
              cols: 1,
              cells: [],
              rowLabels: ['A'],
              colLabels: ['1'],
            },
          })
        if (path === '/api/game/registration') return route.fulfill({ json: state })
        if (path === '/api/game/registration/teams') {
          creates++
          state.myTeam = mine
          state.teams.unshift(mine)
          return route.fulfill({ status: 201, json: mine })
        }
        if (path === '/api/game/registration/my-team/readiness') {
          expect(route.request().method()).toBe('PATCH')
          const { isReady } = route.request().postDataJSON() as { isReady: boolean }
          readinessUpdates.push(isReady)
          mine.members[0]!.readyAtUtc = isReady ? '2026-09-13T00:05:00Z' : null
          mine.isReady = mine.members.every((member) => member.readyAtUtc != null)
          return route.fulfill({ json: mine })
        }
        if (path === '/api/game/registration/my-team/disband-request') {
          if (route.request().method() === 'POST') {
            posts++
            mine.disbandRequestedAtUtc = '2026-09-13T00:00:00Z'
            mine.disbandRequestedByUserId = userId
          } else {
            deletes++
            mine.disbandRequestedAtUtc = null
            mine.disbandRequestedByUserId = null
          }
          return route.fulfill({ json: mine })
        }
        return route.fulfill({ status: 204 })
      },
    )
    await page.goto('/panel/game-application')
    await expect(page.getByRole('heading', { name: 'Заявка на игру' })).toBeVisible()
    await expectUnifiedTypography(page)
    await expect.poll(() => handshaken).toBe(true)
    const sectionNavigation = page.getByRole('navigation', { name: 'Разделы заявки' })
    if (width < 900) {
      await expect(sectionNavigation).toBeVisible()
      await expect(sectionNavigation).toHaveCSS('position', 'sticky')
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await expect(sectionNavigation).toBeInViewport()
      const globalHeaderBox = await page.getByRole('banner').boundingBox()
      const sectionNavigationBox = await sectionNavigation.boundingBox()
      expect(sectionNavigationBox!.y).toBeGreaterThanOrEqual(
        globalHeaderBox!.y + globalHeaderBox!.height - 1,
      )
      await page.evaluate(() => window.scrollTo(0, 0))
    }
    if (width >= 1024) {
      const roster = await page.locator('#application-roster').boundingBox()
      const teams = await page.locator('#application-teams').boundingBox()
      expect(roster?.y).toBe(teams?.y)
    }
    await page.screenshot({
      path: `../.tmp/ui-audit/after/application-create-${suffix}.png`,
      fullPage: true,
      animations: 'disabled',
    })
    const createButton = page.getByRole('button', { name: 'Создать команду' })
    await expectValidFormLabels(page)
    await createButton.click()
    await expect(page.getByRole('alert')).toHaveText('Введите название команды.')
    await expect(page.getByRole('textbox', { name: 'Название команды' })).toBeFocused()
    await expectValidFormLabels(page)
    expect(creates).toBe(0)
    await page.screenshot({
      path: `../.tmp/ui-audit/after/application-hint-${suffix}.png`,
      fullPage: true,
      animations: 'disabled',
    })
    await page.getByRole('textbox', { name: 'Название команды' }).fill('ab')
    await createButton.click()
    await expect(page.getByRole('alert')).toHaveText('Введите минимум 3 символа.')
    expect(creates).toBe(0)
    await page.getByRole('textbox', { name: 'Название команды' }).fill('чЁРНЫЕВОРОНЫ')
    await createButton.click()
    await expect(page.getByRole('alert')).toHaveText('Команда с таким названием уже существует.')
    expect(creates).toBe(0)
    await page.getByRole('textbox', { name: 'Название команды' }).fill('Ночной дозор')
    await createButton.click()
    await expect(page.getByRole('button', { name: 'Изменить название команды' })).toBeVisible()
    await page.getByRole('button', { name: 'Выйти из команды' }).click()
    const leaveDialog = page.getByRole('dialog', { name: 'Выйти из команды?' })
    await expect(leaveDialog).toBeVisible()
    await expect(leaveDialog.locator('.MuiDialogTitle-root')).toHaveCSS(
      'border-bottom-style',
      'solid',
    )
    await expect(leaveDialog.locator('.MuiDialogContent-root')).toHaveCSS(
      'border-bottom-style',
      'solid',
    )
    await page.screenshot({
      path: `../.tmp/ui-audit/after/application-leave-dialog-${suffix}.png`,
      fullPage: true,
      animations: 'disabled',
    })
    await leaveDialog.getByRole('button', { name: 'Отмена' }).click()
    await expect(leaveDialog).toHaveCount(0)
    expect(creates).toBe(1)
    await expect(page.getByRole('button', { name: 'Я готов', exact: true })).toBeDisabled()
    const readinessButton = page.getByRole('button', { name: 'Я готов', exact: true })
    const leaveButton = page.getByRole('button', { name: 'Выйти из команды' })
    const readButtonSurface = (element: HTMLElement) => {
      const style = getComputedStyle(element)
      const texture = getComputedStyle(element, '::before')
      return {
        frame: style.borderImageSource,
        outset: style.borderImageOutset,
        texture: texture.backgroundImage,
        textureDisplay: texture.display,
        textureOpacity: Number(texture.opacity),
        height: element.getBoundingClientRect().height,
      }
    }
    const disabledSurface = await readinessButton.evaluate(readButtonSurface)
    const activeSurface = await leaveButton.evaluate(readButtonSurface)
    expect(disabledSurface.frame).not.toBe('none')
    expect(disabledSurface.frame).toBe(activeSurface.frame)
    expect(disabledSurface.outset).toBe(activeSurface.outset)
    expect(disabledSurface.texture).not.toBe('none')
    expect(disabledSurface.texture).toBe(activeSurface.texture)
    expect(disabledSurface.textureDisplay).not.toBe('none')
    expect(disabledSurface.textureOpacity).toBeGreaterThan(0)
    expect(disabledSurface.textureOpacity).toBeLessThan(activeSurface.textureOpacity)
    expect(disabledSurface.height).toBe(activeSurface.height)
    await page.screenshot({
      path: `../.tmp/ui-audit/after/application-readiness-disabled-${suffix}.png`,
      fullPage: true,
      animations: 'disabled',
    })
    mine.members.push({
      player: { userId: 'teammate', displayName: 'Напарник', login: 'teammate' },
      joinedAtUtc: '2026-09-13T00:00:00Z',
      readyAtUtc: null,
    })
    const publishRegistration = () =>
      socket!.send(
        JSON.stringify({ type: 1, target: 'registrationChanged', arguments: [] }) + '\u001e',
      )
    publishRegistration()
    await page.getByRole('button', { name: 'Я готов', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Снять готовность' })).toBeEnabled()
    await expect(page.getByText('Готовы: 1 / 2', { exact: true })).toBeVisible()
    mine.members[1]!.readyAtUtc = '2026-09-13T00:05:00Z'
    mine.isReady = true
    publishRegistration()
    await expect(page.getByText('Вся команда готова', { exact: true })).toBeVisible()
    const readinessDescription = page.getByText(
      'Все игроки готовы. Администратор видит этот статус.',
      { exact: true },
    )
    await expect(readinessDescription.locator('..')).toHaveCSS('flex-direction', 'column')
    const readyBadgeBox = await page.getByText('Вся команда готова', { exact: true }).boundingBox()
    const readinessDescriptionBox = await readinessDescription.boundingBox()
    expect(readinessDescriptionBox!.y).toBeGreaterThan(readyBadgeBox!.y + readyBadgeBox!.height)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: `../.tmp/ui-audit/after/application-readiness-${suffix}.png`,
      fullPage: true,
      animations: 'disabled',
    })
    await page.getByRole('button', { name: 'Снять готовность' }).click()
    await expect(page.getByRole('button', { name: 'Я готов', exact: true })).toBeEnabled()
    expect(readinessUpdates).toEqual([true, false])
    mine.name = null
    mine.members.forEach((member) => {
      member.readyAtUtc = null
    })
    publishRegistration()
    await expect(page.getByRole('button', { name: 'Я готов', exact: true })).toBeDisabled()
    mine.name = 'Ночной дозор'
    publishRegistration()
    await expect(page.getByRole('button', { name: 'Я готов', exact: true })).toBeEnabled()
    await page.screenshot({
      path: `../.tmp/ui-audit/after/application-forming-${suffix}.png`,
      fullPage: true,
      animations: 'disabled',
    })
    await expect(
      page.getByRole('region', { name: 'Готовы к участию' }).getByRole('article'),
    ).toHaveCount(0)
    const readyToggle = page.getByRole('button', { name: 'Готовы к участию (1 команда)' })
    const formingHeader = page.getByRole('heading', { name: 'В процессе формирования' })
    const formingToggle = page.getByRole('button', { name: 'В процессе формирования' })
    await expect(formingHeader.getByText('В процессе формирования')).toHaveCSS('font-size', '20px')
    await expect(page.getByText('Свернуть список команд')).toHaveCount(0)
    await expect(page.getByText('Раскрыть список команд')).toHaveCount(0)
    const readGroupHeaderStyle = (element: HTMLElement) => {
      const style = getComputedStyle(element)
      return {
        borderBottomStyle: style.borderBottomStyle,
        borderBottomWidth: style.borderBottomWidth,
        minHeight: style.minHeight,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
      }
    }
    expect(await readyToggle.evaluate(readGroupHeaderStyle)).toEqual(
      await formingToggle.evaluate(readGroupHeaderStyle),
    )
    await expect(formingToggle).toHaveAttribute('aria-expanded', 'true')
    await expect(readyToggle).toHaveAttribute('aria-expanded', 'false')
    const formingTeams = page
      .getByRole('region', { name: 'В процессе формирования' })
      .getByRole('article')
    await expect(formingTeams).toHaveCount(2)
    await formingToggle.click()
    await expect(formingToggle).toHaveAttribute('aria-expanded', 'false')
    await expect(formingTeams).toHaveCount(0)
    await formingToggle.click()
    await expect(formingToggle).toHaveAttribute('aria-expanded', 'true')
    await expect(formingTeams).toHaveCount(2)
    const teamSearch = page.getByRole('searchbox', { name: 'Найти команду или игрока' })
    await teamSearch.fill('Скиталец')
    await expect(readyToggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('article', { name: 'Чёрные вороны' })).toBeVisible()
    await teamSearch.fill('')
    await expect(readyToggle).toHaveAttribute('aria-expanded', 'false')
    await readyToggle.click()
    await expect(page.getByRole('article', { name: 'Чёрные вороны' })).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'В процессе формирования' }).getByRole('article'),
    ).toHaveCount(2)
    await expect(page.getByText(/^Слот /)).toHaveCount(0)
    await expect(page.getByText('3 из 3')).toHaveCount(0)
    await expect(page.getByRole('textbox', { name: 'Название команды' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Изменить название команды' }).click()
    await expectUnifiedTypography(page)
    await expectValidFormLabels(page)
    await page.screenshot({
      path: `../.tmp/ui-audit/after/application-name-dialog-${suffix}.png`,
      fullPage: true,
      animations: 'disabled',
    })
    await page.getByRole('textbox', { name: 'Название команды' }).fill('Несохранённое имя')
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Сохранить' })).toHaveClass(
      /MuiButton-containedPrimary/,
    )
    state.teams[2]!.members = [
      {
        player: { userId: 'second', displayName: 'Напарник', login: 'partner' },
        joinedAtUtc: '2026-09-13T00:00:00Z',
      },
    ]
    socket!.send(
      JSON.stringify({ type: 1, target: 'registrationChanged', arguments: [] }) + '\u001e',
    )
    await expect(
      page.getByRole('article', { name: 'Тихая охота', includeHidden: true }),
    ).toContainText('Напарник')
    await expect(page.getByRole('textbox', { name: 'Название команды' })).toHaveValue(
      'Несохранённое имя',
    )
    mine.status = 'confirmed'
    socket!.send(
      JSON.stringify({ type: 1, target: 'registrationChanged', arguments: [] }) + '\u001e',
    )
    await expect(
      page.getByRole('region', { name: 'Готовы к участию' }).getByRole('article'),
    ).toHaveCount(2)
    await expect(page.getByRole('textbox', { name: 'Название команды' })).toHaveCount(0)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({
      path: `../.tmp/ui-audit/after/application-${suffix}.png`,
      fullPage: true,
      animations: 'disabled',
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Попросить распустить команду' }).click()
    await expectUnifiedTypography(page)
    expect(posts).toBe(0)
    await page.screenshot({
      path: `../.tmp/ui-audit/after/application-disband-dialog-${suffix}.png`,
      fullPage: true,
      animations: 'disabled',
    })
    const disbandDialog = page.getByRole('dialog')
    const cancelButtonBox = await disbandDialog
      .getByRole('button', { name: 'Отмена' })
      .boundingBox()
    const confirmButtonBox = await disbandDialog
      .getByRole('button', { name: 'Запросить роспуск' })
      .boundingBox()
    expect(cancelButtonBox).not.toBeNull()
    expect(confirmButtonBox).not.toBeNull()
    expect(Math.abs(cancelButtonBox!.width - confirmButtonBox!.width)).toBeLessThan(1)
    expect(Math.abs(cancelButtonBox!.height - confirmButtonBox!.height)).toBeLessThan(1)
    const cancelFrame = await disbandDialog
      .getByRole('button', { name: 'Отмена' })
      .evaluate((element) => getComputedStyle(element).borderImageSource)
    const confirmFrame = await disbandDialog
      .getByRole('button', { name: 'Запросить роспуск' })
      .evaluate((element) => getComputedStyle(element).borderImageSource)
    expect(cancelFrame).not.toBe('none')
    expect(cancelFrame).toBe(confirmFrame)
    await disbandDialog.getByRole('button', { name: 'Запросить роспуск' }).click()
    await expect(page.getByText('Запрос на роспуск отправлен')).toBeVisible()
    await expect(page.getByText('Состав подтверждён')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Отозвать запрос' })).toBeVisible()
    expect(posts).toBe(1)
    await page.getByRole('button', { name: 'Отозвать запрос' }).click()
    expect(deletes).toBe(0)
    await page.getByRole('dialog').getByRole('button', { name: 'Отмена' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(deletes).toBe(0)
    await page.getByRole('button', { name: 'Отозвать запрос' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Отозвать запрос' }).click()
    await expect(page.getByRole('button', { name: 'Попросить распустить команду' })).toBeVisible()
    expect(deletes).toBe(1)
    expect(mine.status).toBe('confirmed')
    state.gameStatus = 'active'
    socket!.send(
      JSON.stringify({
        type: 1,
        target: 'gameLifecycleChanged',
        arguments: [
          {
            gameId: 'game',
            status: 'active',
            boardVersion: 2,
            occurredAtUtc: '2026-09-13T00:00:00Z',
          },
        ],
      }) + '\u001e',
    )
    await expect(
      page.getByText('Приём заявок закрыт. Дождитесь публикации игры администратором.'),
    ).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(0)
  })
}
