import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { supportedLanguages } from '../src/locales/index.ts'
import guideTranslations from '../src/features/game-guide/i18n/game-guide-translations.ts'
import navigationTranslations from '../src/layouts/i18n/navigation-translations.ts'
import authTranslations from '../src/features/auth/i18n/auth-translations.ts'
import { mockGuideGame } from './support/game-guide-fixture.ts'

for (const language of supportedLanguages) {
  test(`anonymous guide header fits a narrow screen in ${language}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    await page.addInitScript((locale) => localStorage.setItem('i18nextLng', locale), language)
    await page.route('**/auth/me', (route) => route.fulfill({ status: 204 }))
    await page.goto('/panel/game-guide#score')
    await expect(
      page.getByRole('heading', { name: guideTranslations[language].title }),
    ).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const header = page.getByRole('banner')
    const selector = (await header.getByRole('combobox').boundingBox())!
    const login = header.getByRole('button', { name: authTranslations[language].button })
    const loginBox = (await login.boundingBox())!
    expect(selector.x + selector.width).toBeLessThanOrEqual(loginBox.x)
    expect(loginBox.x + loginBox.width).toBeLessThanOrEqual(320)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const headerBox = (await header.boundingBox())!
    const navBox = (await page.locator('#guide-navigation').boundingBox())!
    expect(navBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height)
    await page.screenshot({
      path: `../.tmp/agent-work/public-guide-teams/public-guide-narrow-${language}.png`,
      animations: 'disabled',
    })
  })
}

// Explicitly regenerate product illustrations from the real UI and deterministic data.
// Run with UPDATE_GAME_GUIDE_IMAGES=1 and --grep "capture guide".
for (const language of supportedLanguages) {
  test(`capture guide illustrations in ${language}`, async ({ page }) => {
    test.skip(process.env.UPDATE_GAME_GUIDE_IMAGES !== '1', 'Product image regeneration is opt-in')
    await mkdir('public/images/game-guide', { recursive: true })
    await mockGuideGame(page, language)
    for (const [kind, path, testId] of [
      ['board', 'game-board', 'viewport-board'],
      ['application', 'game-application', 'application-roster'],
    ] as const) {
      if (kind === 'application') await mockGuideGame(page, language, true, 'ready')
      await page.setViewportSize({
        width: kind === 'board' ? 1000 : 1280,
        height: kind === 'board' ? 900 : 700,
      })
      await page.goto(`/panel/${path}`)
      const content =
        kind === 'board' ? page.locator('[data-board-field]') : page.locator(`#${testId}`)
      await expect(content).toBeVisible()
      await page.evaluate(async () => {
        await document.fonts.ready
        await Promise.all(
          document.getAnimations().map((animation) => animation.finished.catch(() => {})),
        )
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        )
      })
      const screenshot = {
        path: `public/images/game-guide/${kind}-${language}.png`,
        animations: 'disabled' as const,
      }
      if (kind === 'application') {
        await page
          .locator('#application-roster input[type="text"]')
          .fill({ ru: 'Искатели', en: 'Seekers', uk: 'Шукачі', pl: 'Poszukiwacze' }[language])
        await page.evaluate(() => scrollTo(0, 0))
        await page.screenshot(screenshot)
      } else await content.screenshot(screenshot)
    }
  })
}

for (const width of [390, 768, 1440]) {
  test(`guide navigation, examples and image preview at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockGuideGame(page)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/panel/game-board')
    const help = page.getByRole('link', { name: 'Как играть', exact: true })
    await help.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/panel\/game-guide$/)
    await expect(help).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { name: guideTranslations.ru.title })).toBeVisible()
    const layout = await page.evaluate(() => {
      const measure = (id: string) => {
        const element = document.getElementById(id)
        if (!element) throw new Error(`Missing guide block: ${id}`)
        const { x, width, top, bottom } = element.getBoundingClientRect()
        return { x, width, top, bottom, position: getComputedStyle(element).position }
      }
      return {
        intro: measure('guide-top'),
        index: measure('guide-navigation'),
        registration: measure('start'),
        round: measure('round'),
      }
    })
    const { intro, index, registration, round } = layout
    expect(index.position).toBe('sticky')
    expect(index.top).toBeGreaterThan(intro.bottom)
    expect(registration.top).toBeGreaterThan(index.bottom)
    for (const block of [index, registration, round]) {
      expect(block.x).toBeCloseTo(intro.x, 0)
      expect(block.width).toBeCloseTo(intro.width, 0)
    }
    const guideNav = page.getByRole('navigation', { name: guideTranslations.ru.contents })
    await guideNav
      .getByRole('link', { name: guideTranslations.ru.sections.quiz, exact: true })
      .click()
    await expect(page.locator('#quiz-title')).toBeInViewport()
    await guideNav
      .getByRole('link', { name: guideTranslations.ru.sections.start, exact: true })
      .click()
    await expect(page.locator('#start-title')).toBeInViewport()
    await expect(
      page.getByText(guideTranslations.ru.start.confirmation, { exact: true }),
    ).toBeVisible()
    await page.getByRole('link', { name: guideTranslations.ru.sections.score, exact: true }).click()
    await expect(page.locator('#score-title')).toBeInViewport()
    await expect(page.locator('#guide-navigation')).toBeInViewport()
    const pinnedLayout = await page.evaluate(() => {
      const nav = document.getElementById('guide-navigation')
      const heading = document.getElementById('score-title')
      const header = document.querySelector('header')
      if (!nav || !heading || !header) throw new Error('Missing guide navigation or heading')
      return {
        headerBottom: header.getBoundingClientRect().bottom,
        navTop: nav.getBoundingClientRect().top,
        navBottom: nav.getBoundingClientRect().bottom,
        headingTop: heading.getBoundingClientRect().top,
      }
    })
    expect(pinnedLayout.headingTop).toBeGreaterThan(pinnedLayout.navBottom)
    expect(pinnedLayout.navTop).toBeGreaterThanOrEqual(pinnedLayout.headerBottom)
    await page.screenshot({ path: `../.tmp/agent-work/game-guide/pinned-${width}.png` })
    await expect(
      page.getByRole('link', { name: guideTranslations.ru.sections.score, exact: true }),
    ).toHaveAttribute('aria-current', 'location')
    await expect(page.getByText('600 - 100 = 500 очков', { exact: true })).toBeVisible()
    await expect(
      page.getByText(guideTranslations.ru.score.persistentTitle, { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText(guideTranslations.ru.score.nextRound, { exact: true }),
    ).toBeVisible()
    await expect(page.locator('#round ol > li')).toHaveCount(6)
    for (const section of ['round', 'score'] as const) {
      await guideNav
        .getByRole('link', { name: guideTranslations.ru.sections[section], exact: true })
        .click()
      await expect(page.locator(`#${section}-title`)).toBeInViewport()
      await page.screenshot({
        path: `../.tmp/agent-work/game-guide/${section}-${width}.png`,
        animations: 'disabled',
      })
      const lastParagraph =
        section === 'round'
          ? guideTranslations.ru.round.result
          : guideTranslations.ru.score.nextRound
      await page.getByText(lastParagraph, { exact: true }).scrollIntoViewIfNeeded()
      await page.screenshot({
        path: `../.tmp/agent-work/game-guide/${section}-end-${width}.png`,
        animations: 'disabled',
      })
    }
    const enlarge = page.getByRole('button', {
      name: `Увеличить: ${guideTranslations.ru.images.board}`,
    })
    await enlarge.click()
    const dialog = page.getByRole('dialog', { name: guideTranslations.ru.images.board })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('img')).toBeVisible()
    if (width === 390) {
      const imageRegion = dialog.getByRole('region', { name: guideTranslations.ru.images.board })
      expect(
        await imageRegion.evaluate((element) => element.scrollWidth > element.clientWidth),
      ).toBe(true)
      await imageRegion.focus()
      await page.keyboard.press('ArrowRight')
      await expect
        .poll(() => imageRegion.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0)
      await dialog.screenshot({ path: '../.tmp/agent-work/game-guide/preview-390.png' })
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(enlarge).toBeFocused()
    await page.getByRole('button', { name: guideTranslations.ru.faq.leave, exact: true }).click()
    await expect(
      page.getByText(guideTranslations.ru.faq.leaveAnswer, { exact: true }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: guideTranslations.ru.faq.rules, exact: true })
      .scrollIntoViewIfNeeded()
    await page.screenshot({
      path: `../.tmp/agent-work/game-guide/bottom-${width}.png`,
      animations: 'disabled',
    })
    await guideNav
      .getByRole('link', { name: guideTranslations.ru.sections.start, exact: true })
      .click()
    await expect(
      page.getByRole('navigation', { name: guideTranslations.ru.contents }),
    ).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => scrollTo(0, 0))
    await page.screenshot({
      path: `../.tmp/agent-work/game-guide/guide-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    })
    expect(errors).toEqual([])
  })
}

for (const language of supportedLanguages) {
  test(`guide loads directly without a game in ${language}`, async ({ page }) => {
    await page.setViewportSize({
      width: { en: 320, ru: 390, uk: 768, pl: 1440 }[language],
      height: 900,
    })
    await mockGuideGame(page, language, false)
    await page.goto('/panel/game-guide')
    const copy = guideTranslations[language]
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    const shortcuts = page.getByRole('navigation', { name: copy.contents }).getByRole('link')
    await expect(shortcuts).toHaveCount(6)
    const labels = await shortcuts.evaluateAll((links) =>
      links.map((link) => {
        const range = document.createRange()
        range.selectNodeContents(link)
        const text = range.getBoundingClientRect()
        const button = link.getBoundingClientRect()
        return {
          lines: range.getClientRects().length,
          offset: Math.abs(text.left + text.width / 2 - button.left - button.width / 2),
        }
      }),
    )
    for (const label of labels) {
      expect(label.lines).toBe(1)
      expect(label.offset).toBeLessThan(2)
    }
    await expect(
      page.getByRole('link', {
        name: navigationTranslations[language].items.gameGuide.label,
        exact: true,
      }),
    ).toHaveAttribute('aria-current', 'page')
    const registrationDetails = page.getByRole('button', { name: copy.start.details, exact: true })
    await expect(registrationDetails).toHaveAttribute('aria-expanded', 'false')
    await registrationDetails.click()
    await expect(page.getByText(copy.start.body, { exact: true })).toBeVisible()
    for (const kind of ['application', 'board'] as const) {
      const img = page.getByRole('img', { name: copy.images[kind] })
      await img.scrollIntoViewIfNeeded()
      await expect(img).toBeVisible()
      expect(
        await img.evaluate((element: HTMLImageElement) => element.naturalWidth),
      ).toBeGreaterThan(0)
    }
    await registrationDetails.click()
    await expect(registrationDetails).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByText(copy.score.total, { exact: true })).toBeVisible()
    await expect(page.getByText(copy.modifiers.ownTeamTitle, { exact: true })).toBeVisible()
    await expect(page.getByText(copy.start.windowTitle, { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => scrollTo(0, 0))
    await page.screenshot({ path: `../.tmp/agent-work/game-guide/top-${language}.png` })
  })
}

test('guide deep links, current section and FAQ work with a keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockGuideGame(page)
  await page.goto('/panel/game-guide#quiz')
  const nav = page.getByRole('navigation', { name: guideTranslations.ru.contents })
  await expect(page.locator('#quiz-title')).toBeInViewport()
  await expect(nav.getByRole('link', { name: guideTranslations.ru.sections.quiz })).toHaveAttribute(
    'aria-current',
    'location',
  )
  await page.reload()
  await expect(page.locator('#quiz-title')).toBeInViewport()
  await expect(page.getByText(guideTranslations.ru.quiz.answerRule, { exact: true })).toBeVisible()
  await nav.getByRole('link', { name: guideTranslations.ru.sections.modifiers }).click()
  await expect(page.locator('#modifiers-title')).toBeInViewport()
  await expect(
    page.getByText(guideTranslations.ru.modifiers.essence, { exact: true }),
  ).toBeVisible()
  const faqLink = nav.getByRole('link', { name: guideTranslations.ru.sections.faq })
  await faqLink.focus()
  await page.keyboard.press('Enter')
  await expect(faqLink).toHaveAttribute('aria-current', 'location')
  const question = page.getByRole('button', { name: guideTranslations.ru.faq.blocked, exact: true })
  await question.focus()
  await page.keyboard.press('Enter')
  await expect(question).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#faq-blocked-answer')).toHaveCount(1)
  await expect(
    page.getByRole('region', { name: guideTranslations.ru.faq.blocked, exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText(guideTranslations.ru.faq.blockedAnswer, { exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(question).toHaveAttribute('aria-expanded', 'false')
  await page
    .locator('#modifiers')
    .screenshot({ path: '../.tmp/agent-work/game-guide/modifiers-desktop.png' })
})

test('guide remains readable when an illustration fails', async ({ page }) => {
  await mockGuideGame(page, 'ru', false)
  await page.route('**/images/game-guide/*.png', (route) => route.abort())
  await page.goto('/panel/game-guide')
  await page.getByRole('button', { name: guideTranslations.ru.start.details, exact: true }).click()
  await expect(page.getByText(guideTranslations.ru.images.error).first()).toBeVisible()
  await expect(page.getByText(guideTranslations.ru.start.body, { exact: true })).toBeVisible()
})

test('guide details reveal rules and the application example with keyboard access', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await mockGuideGame(page)
  await page.goto('/panel/game-guide')
  const copy = guideTranslations.ru
  for (const [label, answer] of [
    [copy.start.details, copy.start.ready],
    [copy.modifiers.checkTitle, copy.modifiers.timers],
    [copy.score.details, copy.score.penaltyRule],
  ] as const) {
    const trigger = page.getByRole('button', { name: label, exact: true })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const controlledId = await trigger.getAttribute('aria-controls')
    expect(controlledId).toBeTruthy()
    await expect(page.locator(`[id="${controlledId}"]`)).toHaveCount(1)
    await expect(page.getByRole('region', { name: label, exact: true })).toBeVisible()
    await expect(page.getByText(answer, { exact: true })).toBeVisible()
  }
  const enlargeApplication = page.getByRole('button', {
    name: `Увеличить: ${copy.images.application}`,
  })
  await enlargeApplication.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: copy.images.application })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('img')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(enlargeApplication).toBeFocused()
  await page
    .locator('#start')
    .screenshot({ path: '../.tmp/agent-work/game-guide/registration-details-390.png' })
  await page
    .locator('#score')
    .screenshot({ path: '../.tmp/agent-work/game-guide/scoring-details-390.png' })
})

test('guide top index remains usable in a short desktop window', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 400 })
  await mockGuideGame(page)
  await page.goto('/panel/game-guide#score')
  const nav = page.getByRole('navigation', { name: guideTranslations.ru.contents })
  await nav.getByRole('link', { name: guideTranslations.ru.sections.faq }).click()
  await expect(page.locator('#faq-title')).toBeInViewport()
  await nav.getByRole('link', { name: guideTranslations.ru.sections.start }).click()
  await expect(page.locator('#start-title')).toBeInViewport()
})

for (const width of [390, 768, 1440]) {
  test(`anonymous guide opens directly without game requests at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'))
    const gameRequests: string[] = []
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.route('**/auth/me', (route) => route.fulfill({ status: 204 }))
    await page.route(
      (url) => url.pathname.startsWith('/api/') || url.pathname.startsWith('/hubs/'),
      (route) => {
        gameRequests.push(new URL(route.request().url()).pathname)
        return route.fulfill({ status: 401 })
      },
    )
    const destination = '/panel/game-guide?from=shared#score'
    await page.goto(destination)
    await expect(page).toHaveURL(destination)
    await expect(page.getByRole('heading', { name: guideTranslations.ru.title })).toBeVisible()
    await expect(page.locator('#score-title')).toBeInViewport()
    await page.reload()
    await expect(page).toHaveURL(destination)
    await expect(page.locator('#score-title')).toBeInViewport()
    const headerBox = (await page.getByRole('banner').boundingBox())!
    const navigationBox = (await page.locator('#guide-navigation').boundingBox())!
    expect(navigationBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height)
    const scoreBox = (await page.locator('#score-title').boundingBox())!
    expect(scoreBox.y).toBeGreaterThanOrEqual(navigationBox.y + navigationBox.height)

    const nav = page.getByRole('navigation', { name: guideTranslations.ru.contents })
    await nav.getByRole('link', { name: guideTranslations.ru.sections.round, exact: true }).click()
    const enlarge = page.getByRole('button', {
      name: `Увеличить: ${guideTranslations.ru.images.board}`,
    })
    await enlarge.click()
    const dialog = page.getByRole('dialog', { name: guideTranslations.ru.images.board })
    await expect(dialog.getByRole('img')).toBeVisible()
    expect(
      await dialog.getByRole('img').evaluate((image) => (image as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(0)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(enlarge).toBeFocused()
    await page.evaluate(() => scrollTo(0, 0))
    await page.evaluate(() => document.fonts.ready)
    await expect(page.getByRole('button', { name: 'Войти через Twitch' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: `../.tmp/agent-work/public-guide-teams/public-guide-${width}.png`,
      animations: 'disabled',
    })
    expect(gameRequests).toEqual([])
    expect(errors).toEqual([])
    await page.goto('/panel/game-board')
    await expect(page).toHaveURL('/?returnTo=%2Fpanel%2Fgame-board')
  })
}
