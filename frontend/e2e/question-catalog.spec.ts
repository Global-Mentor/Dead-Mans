import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import type {
  CreateGameQuestionRequest,
  GameQuestionCatalogItem,
  GameQuestionCategoryItem,
} from '../src/shared/api/contracts/index.ts'

test.use({ reducedMotion: 'reduce' })

const categories: GameQuestionCategoryItem[] = [
  { id: 'geo', name: 'География', questionCount: 12, isProtected: false },
  { id: 'science', name: 'Наука', questionCount: 12, isProtected: false },
  { id: 'empty', name: 'Новая категория', questionCount: 0, isProtected: false },
  { id: 'system', name: 'БЕЗ КАТЕГОРИИ', questionCount: 0, isProtected: true },
]
const catalog: GameQuestionCatalogItem[] = Array.from({ length: 24 }, (_, index) => ({
  questionId: 'question-' + index,
  questionCode: 'q-' + index,
  categoryId: index < 12 ? 'geo' : 'science',
  categoryName: index < 12 ? 'География' : 'Наука',
  text:
    index === 0
      ? 'Какой город является столицей Польши?'
      : index === 1
        ? 'Какой океан самый большой на Земле?'
        : 'Вопрос ' + index + ' с подробной формулировкой для викторины',
  reward: index * 5,
  priority: index % 3,
  isEnabled: index % 4 !== 1,
  twitchCompatible: index % 5 !== 2,
  askedTotalCount: index % 6,
  submissionTotalCount: index === 0 ? 0 : 100,
  correctSubmissionTotalCount: index === 0 ? 0 : 65,
  correctPercentage: index === 0 ? 0 : 65,
  options: [
    { optionId: 'a-' + index, text: 'Варшава', isCorrect: true, sortOrder: 0 },
    { optionId: 'b-' + index, text: 'Краков', isCorrect: false, sortOrder: 1 },
    { optionId: 'c-' + index, text: 'Гданьск', isCorrect: false, sortOrder: 2 },
    { optionId: 'd-' + index, text: 'Вроцлав', isCorrect: false, sortOrder: 3 },
  ],
}))

async function mockCatalog(page: Page, language = 'ru') {
  await page.addInitScript((language) => localStorage.setItem('i18nextLng', language), language)
  await page.routeWebSocket(/\/hubs\//, (socket) =>
    socket.onMessage((message) => {
      if (message.toString().includes('"protocol"')) socket.send('{}\u001e')
    }),
  )
  const state = {
    items: [...catalog],
    categories: categories.map((category) => ({ ...category })),
    failCatalog: false,
    failSave: false,
    failDelete: false,
    failPreview: false,
    pendingSave: false,
    releaseSave: () => {},
    saves: [] as CreateGameQuestionRequest[],
  }
  await page.route(
    (url) =>
      url.pathname === '/auth/me' ||
      url.pathname.startsWith('/api/') ||
      url.pathname.includes('/negotiate'),
    async (route) => {
      const path = new URL(route.request().url()).pathname
      const method = route.request().method()
      if (path === '/auth/me')
        return route.fulfill({
          json: {
            userId: 'abf3680b-ac92-43ce-8c4f-c542f806e520',
            displayName: 'Administrator',
            roles: ['admin', 'viewer'],
          },
        })
      if (path.includes('/negotiate'))
        return route.fulfill({
          json: {
            negotiateVersion: 1,
            connectionId: 'questions',
            connectionToken: 'questions',
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text'] }],
          },
        })
      if (path === '/api/game/questions/categories' && method === 'GET')
        return route.fulfill({ json: state.categories })
      if (path === '/api/game/questions/categories' && method === 'POST') {
        const category = {
          id: 'created-category',
          name: route.request().postDataJSON().name,
          questionCount: 0,
          isProtected: false,
        }
        state.categories.push(category)
        return route.fulfill({ status: 201, json: category })
      }
      if (path.startsWith('/api/game/questions/categories/') && method === 'PUT') {
        const category = state.categories.find((item) => path.endsWith('/' + item.id))!
        category.name = route.request().postDataJSON().name
        return route.fulfill({ json: category })
      }
      if (path.startsWith('/api/game/questions/categories/') && method === 'DELETE') {
        state.categories = state.categories.filter((item) => !path.endsWith('/' + item.id))
        return route.fulfill({ status: 204 })
      }
      if (path === '/api/game/questions/catalog')
        return state.failCatalog
          ? route.fulfill({ status: 500 })
          : route.fulfill({ json: state.items })
      if (path === '/api/game/questions/twitch-preview')
        return state.failPreview
          ? route.fulfill({ status: 500 })
          : route.fulfill({
              json: {
                question: 'Вопрос для чата',
                questionLength: 16,
                options: 'A. Варшава B. Краков',
                optionsLength: 20,
                resultTemplate: 'Правильный ответ: Варшава',
                resultMaximumLength: 24,
                maximumLength: 500,
                isCompatible: true,
              },
            })
      if (path === '/api/game/questions' && method === 'POST') {
        const request = route.request().postDataJSON() as CreateGameQuestionRequest
        state.saves.push(request)
        const saved = {
          ...catalog[0]!,
          ...request,
          questionId: 'created-question',
          options: request.options.map((option, index) => ({
            ...option,
            optionId: 'created-' + index,
            sortOrder: index,
          })),
        }
        state.items.push(saved)
        return route.fulfill({ status: 201, json: saved })
      }
      if (path.startsWith('/api/game/questions/') && method === 'PUT') {
        const request = route.request().postDataJSON() as CreateGameQuestionRequest
        state.saves.push(request)
        if (state.pendingSave)
          await new Promise<void>((resolve) => {
            state.releaseSave = resolve
          })
        if (state.failSave) return route.fulfill({ status: 500 })
        const target = state.items.find((item) => path.endsWith('/' + item.questionId))
        if (!target) return route.fulfill({ status: 404 })
        const saved = {
          ...target,
          ...request,
          options: request.options.map((option, index) => ({
            ...option,
            optionId: 'saved-' + index,
            sortOrder: index,
          })),
        }
        state.items = state.items.map((item) =>
          item.questionId === saved.questionId ? saved : item,
        )
        return route.fulfill({ json: saved })
      }
      if (path.startsWith('/api/game/questions/') && method === 'DELETE') {
        if (state.failDelete) return route.fulfill({ status: 500 })
        state.items = state.items.filter((item) => !path.endsWith('/' + item.questionId))
        return route.fulfill({ status: 204 })
      }
      return route.fulfill({ status: 204 })
    },
  )
  return state
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 768, height: 900 },
  { width: 390, height: 844 },
]) {
  test(
    'populated question workspace, editor and retained mobile preview at ' + viewport.width + 'px',
    async ({ page }, testInfo) => {
      await page.setViewportSize(viewport)
      await mockCatalog(page)
      await page.goto('/panel/catalog-questions')
      const list = page.getByTestId('question-catalog-list')
      await expect(list.getByRole('button')).toHaveCount(24)
      await list.getByRole('button', { name: catalog[0]!.text, exact: true }).click()
      const details = page.getByTestId('question-catalog-details')
      await expect(details.getByRole('heading', { name: catalog[0]!.text })).toBeVisible()
      await expect(details.getByText('Правильный ответ', { exact: true })).toBeVisible()
      const firstAnswer = await details.getByRole('listitem').nth(0).boundingBox()
      const secondAnswer = await details.getByRole('listitem').nth(1).boundingBox()
      expect(Math.abs(firstAnswer!.y - secondAnswer!.y)).toBeLessThan(2)
      expect(secondAnswer!.x).toBeGreaterThan(firstAnswer!.x)
      await details.getByRole('button', { name: 'Статистика использования' }).click()
      await expect(details.getByText('Ответов пока нет')).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({
        path: testInfo.outputPath('question-details-' + viewport.width + '.png'),
      })
      await details.getByRole('button', { name: 'Изменить', exact: true }).click()
      const editor = page.getByRole('dialog', { name: 'Редактирование вопроса' })
      await expect(editor.getByLabel(/^Вопрос\s*\*?$/)).toHaveValue(catalog[0]!.text)
      await expect(editor.getByRole('button', { name: 'Сообщения для Twitch' })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
      await editor.getByLabel(/^Вопрос\s*\*?$/).fill('Несохранённый вопрос')
      await page.setViewportSize({ width: viewport.width === 1440 ? 768 : 1440, height: 1000 })
      await expect(editor.getByLabel(/^Вопрос\s*\*?$/)).toHaveValue('Несохранённый вопрос')
      await page.setViewportSize(viewport)
      await page.screenshot({
        path: testInfo.outputPath('question-editor-' + viewport.width + '.png'),
      })
      await editor.getByRole('button', { name: 'Отмена', exact: true }).click()
      const discard = page
        .getByRole('dialog')
        .filter({ hasText: 'Отменить несохранённые изменения?' })
      await expect(discard).toBeVisible()
      await discard.getByRole('button', { name: 'Сбросить', exact: true }).click()
      await expect(editor).toBeHidden()
      await expect(details.getByRole('heading', { name: catalog[0]!.text })).toBeVisible()
      if (viewport.width < 1200)
        await page
          .getByRole('dialog', { name: 'Просмотр вопроса' })
          .getByRole('button', { name: 'Закрыть', exact: true })
          .click()
      expect(
        await page.evaluate(() => ({
          horizontal: document.documentElement.scrollWidth > innerWidth,
          vertical: document.documentElement.scrollHeight > innerHeight,
        })),
      ).toEqual({ horizontal: false, vertical: false })
      await page.screenshot({
        path: testInfo.outputPath('question-catalog-' + viewport.width + '.png'),
      })
    },
  )
}

test('filters intersect, searches include answers, reset restores every filter and creation uses the selected category', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockCatalog(page)
  await page.goto('/panel/catalog-questions')
  const list = page.getByTestId('question-catalog-list')
  await expect(list.getByRole('button')).toHaveCount(24)
  await page.getByRole('button', { name: 'Фильтры (0)' }).click()
  await page.getByRole('combobox', { name: 'Категории' }).click()
  await page.getByRole('option', { name: 'География (12)', exact: true }).click()
  await page.getByRole('combobox', { name: 'Доступность' }).click()
  await page.getByRole('option', { name: 'Выключен', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Чат Twitch' })).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Поиск вопросов' }).fill('Краков')
  await expect(list.getByRole('button')).toHaveCount(3)
  for (const index of [1, 5, 9])
    await expect(
      list.getByRole('button', { name: catalog[index]!.text, exact: true }),
    ).toBeVisible()
  await page.getByRole('button', { name: 'Добавить вопрос', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Новый вопрос' })
  await expect(editor.getByRole('combobox', { name: /Категория/ })).toHaveText('География')
  await editor.getByRole('button', { name: 'Отмена', exact: true }).click()
  await page.getByRole('textbox', { name: 'Поиск вопросов' }).fill('нет такого вопроса')
  await expect(list.getByRole('button')).toHaveCount(0)
  await expect(list.getByText('Показано: 0 из 24')).toBeVisible()
  await expect(page.getByText('По этим фильтрам вопросов не найдено.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Сбросить фильтры', exact: true }).last().click()
  await expect(list.getByRole('button')).toHaveCount(24)
  await expect(page.getByRole('textbox', { name: 'Поиск вопросов' })).toBeEmpty()
})

test('failed mutations retain their target and successful save survives a failed refresh', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const state = await mockCatalog(page)
  await page.goto('/panel/catalog-questions')
  await page
    .getByTestId('question-catalog-list')
    .getByRole('button', { name: catalog[0]!.text, exact: true })
    .click()
  const details = page.getByTestId('question-catalog-details')
  await details.getByRole('button', { name: 'Изменить', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Редактирование вопроса' })
  await editor.getByLabel(/^Вопрос\s*\*?$/).fill('Сохранённый вопрос')
  state.failSave = true
  state.pendingSave = true
  await editor.getByRole('button', { name: 'Сохранить', exact: true }).click()
  const saveConfirmation = page.getByRole('dialog', { name: 'Сохранить изменения вопроса' })
  await saveConfirmation.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(saveConfirmation.getByRole('button', { name: 'Отмена', exact: true })).toBeDisabled()
  await saveConfirmation.press('Escape')
  await expect(saveConfirmation).toBeVisible()
  state.releaseSave()
  await expect(editor.getByRole('alert')).toBeVisible()
  await expect(editor.getByLabel(/^Вопрос\s*\*?$/)).toHaveValue('Сохранённый вопрос')
  state.failSave = false
  state.pendingSave = false
  state.failCatalog = true
  await editor.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await saveConfirmation.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(editor).toBeHidden()
  await expect(details.getByRole('heading', { name: 'Сохранённый вопрос' })).toBeVisible()
  state.failDelete = true
  await details.getByRole('button', { name: 'Удалить', exact: true }).click()
  const confirm = page.getByRole('dialog', { name: 'Удалить вопрос' })
  await expect(confirm.getByText('Сохранённый вопрос', { exact: true })).toBeVisible()
  await confirm.getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(confirm.getByRole('alert')).toBeVisible()
  state.failDelete = false
  await confirm.getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(confirm).toBeHidden()
  await expect(
    page.getByTestId('question-catalog-list').getByRole('button', { name: 'Сохранённый вопрос' }),
  ).toHaveCount(0)
})

test('chat preview failure is explicit and can be retried without losing the editor', async ({
  page,
}) => {
  const state = await mockCatalog(page)
  state.failPreview = true
  await page.goto('/panel/catalog-questions')
  await page
    .getByTestId('question-catalog-list')
    .getByRole('button', { name: catalog[0]!.text, exact: true })
    .click()
  const details = page.getByTestId('question-catalog-details')
  await details.getByRole('button', { name: 'Изменить', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Редактирование вопроса' })
  await editor.getByRole('button', { name: 'Сообщения для Twitch' }).click()
  await expect(
    editor.getByText('Не удалось проверить сообщения для чата. Повторите проверку длины.'),
  ).toBeVisible()
  state.failPreview = false
  await editor.getByRole('button', { name: 'Повторить', exact: true }).click()
  await expect(editor.getByText('Сообщения помещаются в чат Twitch.')).toBeVisible()
  await expect(editor.getByLabel(/^Правильный ответ\s*\*?$/)).toHaveValue('Варшава')
})

for (const language of ['en', 'uk', 'pl']) {
  test('question catalog and form load translated controls in ' + language, async ({ page }) => {
    await mockCatalog(page, language)
    await page.goto('/panel/catalog-questions')
    await expect(page.getByTestId('question-catalog-list').getByRole('button')).toHaveCount(24)
    await page
      .getByTestId('question-catalog-list')
      .getByRole('button', { name: catalog[0]!.text, exact: true })
      .click()
    const details = page.getByTestId('question-catalog-details')
    await details.getByRole('button').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.locator('body')).not.toContainText('gameCatalog.')
    await expect(page.getByRole('dialog').getByRole('textbox')).toHaveCount(5)
  })
}

for (const initial of ['empty', 'error']) {
  test(
    'distinguishes initial ' + initial + ' state and keeps creation and retry usable',
    async ({ page }) => {
      const state = await mockCatalog(page)
      if (initial === 'empty') state.items = []
      else state.failCatalog = true
      await page.goto('/panel/catalog-questions')
      if (initial === 'empty') {
        await expect(page.getByText('Вопросов пока нет. Добавьте первый.')).toBeVisible()
        await page.getByRole('button', { name: 'Добавить вопрос', exact: true }).click()
        await expect(page.getByRole('dialog', { name: 'Новый вопрос' })).toBeVisible()
      } else {
        await expect(page.getByText('Не удалось загрузить каталог вопросов.')).toBeVisible()
        state.failCatalog = false
        await page.getByRole('button', { name: 'Повторить', exact: true }).click()
        await expect(page.getByTestId('question-catalog-list').getByRole('button')).toHaveCount(24)
      }
    },
  )
}

test('long questions and categories remain accessible in a short phone viewport', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 })
  const state = await mockCatalog(page)
  const original = state.items[0]!
  state.items = [
    {
      ...original,
      text: original.text.repeat(4),
      categoryName: 'Категория с очень длинным названием для вопросов викторины',
      options: original.options.map((option) => ({ ...option, text: option.text.repeat(12) })),
    },
  ]
  await page.goto('/panel/catalog-questions')
  await page
    .getByTestId('question-catalog-list')
    .getByRole('button', { name: state.items[0]!.text, exact: true })
    .press('Enter')
  const preview = page.getByRole('dialog', { name: 'Просмотр вопроса' })
  await expect(preview).toBeVisible()
  expect(await preview.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(false)
  await page.screenshot({ path: testInfo.outputPath('question-details-short-phone.png') })
  await preview.getByRole('button', { name: 'Закрыть', exact: true }).click()
  await expect(page.getByTestId('question-catalog-list').getByRole('button')).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('category management chooses its target in the dialog and protects populated and system categories', async ({
  page,
}, info) => {
  const state = await mockCatalog(page)
  await page.goto('/panel/catalog-questions')
  await page.getByRole('button', { name: 'Изменение категории', exact: true }).click()
  const manager = page.getByRole('dialog', { name: 'Изменение категории' })
  await manager.getByRole('textbox').fill('Спорт')
  await manager.getByRole('button', { name: 'Сохранить', exact: true }).click()
  const addConfirmation = page.getByRole('dialog', { name: 'Добавить категорию', exact: true })
  await expect(addConfirmation.getByText('Действительно добавить категорию?')).toBeVisible()
  await expect(addConfirmation.getByText('Спорт', { exact: true })).toBeVisible()
  expect(state.categories.some((item) => item.name === 'Спорт')).toBe(false)
  await addConfirmation.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(manager.getByRole('textbox')).toHaveValue('Спорт')
  await manager.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await addConfirmation.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(manager).toBeHidden()
  expect(state.categories.some((item) => item.name === 'Спорт')).toBe(true)
  await page.getByRole('button', { name: 'Изменение категории', exact: true }).click()
  await manager.getByRole('combobox', { name: 'Действие' }).click()
  await page.getByRole('option', { name: 'Переименовать категорию', exact: true }).click()
  await expect(manager.getByRole('textbox')).toHaveValue('География')
  await manager.getByRole('textbox').fill('Планета')
  await manager.getByRole('button', { name: 'Сохранить', exact: true }).click()
  const renameConfirmation = page.getByRole('dialog', {
    name: 'Переименовать категорию',
    exact: true,
  })
  await expect(renameConfirmation.getByText('Действительно переименовать категорию?')).toBeVisible()
  const action = renameConfirmation.getByText('Действительно переименовать категорию?')
  const subject = renameConfirmation.getByText('География → Планета', { exact: true })
  await expect(subject).toBeVisible()
  expect((await subject.boundingBox())!.y).toBeGreaterThan((await action.boundingBox())!.y)
  await page.screenshot({ path: info.outputPath('category-confirmation.png') })
  expect(state.categories[0]?.name).toBe('География')
  await renameConfirmation.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(manager).toBeHidden()
  expect(state.categories[0]?.name).toBe('Планета')
  await expect(page.getByRole('combobox', { name: 'Категории' })).toHaveText('Все категории')
  await page.getByRole('button', { name: 'Изменение категории', exact: true }).click()
  await manager.getByRole('combobox', { name: 'Действие' }).click()
  await page.getByRole('option', { name: 'Удалить категорию', exact: true }).click()
  await expect(manager.getByRole('button', { name: 'Удалить', exact: true })).toBeDisabled()
  await manager.getByRole('combobox', { name: /^Категория/ }).click()
  await expect(page.getByRole('option', { name: 'БЕЗ КАТЕГОРИИ' })).toHaveCount(0)
  await page.getByRole('option', { name: 'Новая категория', exact: true }).click()
  await manager.getByRole('button', { name: 'Удалить', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: 'Удалить категорию' })
  await confirmation.getByRole('button', { name: 'Отмена', exact: true }).click()
  expect(state.categories.some((item) => item.id === 'empty')).toBe(true)
  await manager.getByRole('button', { name: 'Удалить', exact: true }).click()
  await confirmation.getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(manager).toBeHidden()
  expect(state.categories.some((item) => item.id === 'empty')).toBe(false)
})

for (const width of [1440, 768, 390]) {
  test(
    'ten answer editor and persistent incomplete preview at ' + width + 'px',
    async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 })
      await mockCatalog(page)
      await page.goto('/panel/catalog-questions')
      await page.getByRole('button', { name: 'Добавить вопрос', exact: true }).click()
      const editor = page.getByRole('dialog', { name: 'Новый вопрос' })
      const disclosure = editor.getByRole('button', { name: 'Сообщения для Twitch', exact: true })
      await expect(disclosure).toHaveAttribute('aria-expanded', 'false')
      await expect(editor.getByText('Вопрос для чата', { exact: true })).toBeHidden()
      await disclosure.click()
      await expect(editor.getByText('Вопрос для чата', { exact: true })).toBeVisible()
      await editor.getByLabel(/^Вопрос\s*\*?$/).fill('Частичный вопрос')
      await expect(editor.getByText('Вопрос для чата', { exact: true })).toBeVisible()
      await expect(editor.getByText('Сообщения помещаются в чат Twitch.')).toBeVisible()
      await disclosure.locator('..').scrollIntoViewIfNeeded()
      await page.screenshot({ path: testInfo.outputPath('twitch-preview-' + width + '.png') })
      for (let count = 4; count < 10; count++)
        await editor.getByRole('button', { name: 'Добавить вариант', exact: true }).click()
      await expect(
        editor.getByRole('button', { name: 'Добавить вариант', exact: true }),
      ).toBeDisabled()
      const fields = await editor.getByRole('textbox').all()
      expect(fields).toHaveLength(11)
      expect(await editor.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
        false,
      )
      if (width >= 768) {
        const correct = await editor.getByLabel(/^Правильный ответ\s*\*?$/).boundingBox()
        const alternative = await editor
          .getByRole('textbox', { name: 'Неверный вариант 1', exact: true })
          .boundingBox()
        expect(Math.abs(correct!.width - alternative!.width)).toBeLessThan(2)
        expect(Math.abs(correct!.x - alternative!.x)).toBeLessThan(1)
        expect(alternative!.y).toBeGreaterThanOrEqual(correct!.y + correct!.height)
      }
      await editor.getByLabel(/^Вопрос\s*\*?$/).scrollIntoViewIfNeeded()
      await page.screenshot({ path: testInfo.outputPath('ten-answers-' + width + '.png') })
    },
  )
}

test('preview keeps its last messages after edits and failed updates', async ({ page }) => {
  const state = await mockCatalog(page)
  await page.goto('/panel/catalog-questions')
  await page.getByRole('button', { name: 'Добавить вопрос', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Новый вопрос' })
  await editor.getByRole('button', { name: 'Сообщения для Twitch', exact: true }).click()
  await expect(editor.getByText('Вопрос для чата', { exact: true })).toBeVisible()
  state.failPreview = true
  await editor.getByLabel(/^Вопрос\s*\*?$/).fill('Изменённый черновик')
  await expect(editor.getByText('Вопрос для чата', { exact: true })).toBeVisible()
  await expect(
    editor.getByText('Не удалось проверить сообщения для чата. Повторите проверку длины.'),
  ).toBeVisible()
  await expect(editor.getByText('Вопрос для чата', { exact: true })).toBeVisible()
  await expect(editor.getByLabel(/^Вопрос\s*\*?$/)).toHaveValue('Изменённый черновик')
})

test('creation requires confirmation and cancelling keeps the new question draft', async ({
  page,
}) => {
  const state = await mockCatalog(page)
  await page.goto('/panel/catalog-questions')
  await page.getByRole('button', { name: 'Добавить вопрос', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Новый вопрос' })
  await editor.getByLabel(/^Вопрос\s*\*?$/).fill('Новый вопрос для каталога')
  await editor.getByLabel(/^Правильный ответ\s*\*?$/).fill('Правильно')
  for (const number of [1, 2, 3])
    await editor
      .getByRole('textbox', { name: 'Неверный вариант ' + number, exact: true })
      .fill('Неправильно ' + number)
  await editor.getByRole('button', { name: 'Сохранить', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: 'Добавить вопрос', exact: true })
  await expect(confirmation).toBeVisible()
  expect(state.saves).toHaveLength(0)
  await confirmation.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(editor.getByLabel(/^Вопрос\s*\*?$/)).toHaveValue('Новый вопрос для каталога')
  await editor.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await confirmation.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(editor).toBeHidden()
  expect(state.saves).toHaveLength(1)
})

test('import menu opens below the right edge of its trigger', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await mockCatalog(page)
  await page.goto('/panel/catalog-questions')
  const trigger = page.getByRole('button', { name: 'Развернуть импорт из JSON', exact: true })
  const triggerBox = (await trigger.boundingBox())!
  await trigger.click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await expect(menu.locator('..')).toHaveCSS('opacity', '1')
  const menuBox = (await menu.boundingBox())!
  expect(Math.abs(menuBox.x + menuBox.width - triggerBox.x - triggerBox.width)).toBeLessThan(2)
  expect(menuBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height)
  await page.screenshot({ path: testInfo.outputPath('import-menu.png') })
})

test('form choices match the import menu and keep keyboard selection and focus', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await mockCatalog(page)
  await page.goto('/panel/catalog-questions')
  const trigger = page.getByRole('button', { name: 'Развернуть импорт из JSON' })
  await trigger.click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await expect(menu.locator('..')).toHaveCSS('opacity', '1')
  const reference = await menu.locator('..').evaluate((element) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundImage, border: style.borderColor }
  })
  const itemStyle = await menu
    .getByRole('menuitem')
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element)
      return { font: style.fontSize, padding: style.padding }
    })
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  const category = page.getByRole('combobox', { name: 'Категории' })
  const fieldBox = (await category.boundingBox())!
  const anchorWidth = await category.evaluate((element) => element.parentElement!.clientWidth)
  await category.click()
  const list = page.getByRole('listbox')
  await expect(list).toBeVisible()
  await expect(list.locator('..')).toHaveCSS('opacity', '1')
  const popupBox = (await list.locator('..').boundingBox())!
  // MUI sizes the menu against the anchor's integer clientWidth.
  expect(popupBox.width).toBeGreaterThanOrEqual(anchorWidth)
  expect(popupBox.width).toBeLessThan(fieldBox.width + 100)
  expect(Math.abs(popupBox.x - fieldBox.x)).toBeLessThan(8)
  expect(
    await list.locator('..').evaluate((element) => {
      const style = getComputedStyle(element)
      return { background: style.backgroundImage, border: style.borderColor }
    }),
  ).toEqual(reference)
  expect(
    await list
      .getByRole('option')
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element)
        return { font: style.fontSize, padding: style.padding }
      }),
  ).toEqual(itemStyle)
  expect(
    await list
      .getByRole('option')
      .nth(1)
      .evaluate((element) => getComputedStyle(element, '::before').height),
  ).toBe('1px')
  await page.screenshot({ path: info.outputPath('category-dropdown.png') })
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(category).toBeFocused()
  await expect(list).toBeHidden()
  await expect(page.getByTestId('question-catalog-list').getByRole('button')).toHaveCount(12)
})

test('category action choices have thin separators and preserve keyboard highlighting', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 768, height: 1000 })
  await mockCatalog(page)
  await page.goto('/panel/catalog-questions')
  await page.getByRole('button', { name: 'Изменение категории', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Изменение категории' })
  await dialog.getByRole('combobox', { name: /Действие/ }).click()
  const choices = page.getByRole('listbox')
  await expect(choices).toBeVisible()
  await expect(choices.locator('..')).toHaveCSS('opacity', '1')
  const rename = choices.getByRole('option', { name: 'Переименовать категорию', exact: true })
  await expect(rename).toHaveAttribute('aria-selected', 'false')
  await expect(rename).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  expect(await rename.evaluate((element) => getComputedStyle(element, '::before').height)).toBe(
    '1px',
  )
  await page.keyboard.press('ArrowDown')
  await expect(rename).toBeFocused()
  await page.screenshot({ path: info.outputPath('category-actions.png') })
  await page.keyboard.press('Enter')
  await expect(dialog.getByRole('combobox', { name: /Действие/ })).toHaveText(
    'Переименовать категорию',
  )
})

test('JSON import uploads the file, refreshes the catalog and exports rejected source options', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const state = await mockCatalog(page)
  const rows = Array.from({ length: 10 }, (_, index) => ({
    text: 'Импортированный вопрос ' + (index + 1),
    externalCode: 'import-' + index,
    options: [
      { text: 'Да', isCorrect: true },
      { text: 'Нет', isCorrect: false },
    ],
    reward: index === 7 ? -1 : 5,
    ...(index < 3 ? { categoryId: 'geo' } : {}),
  }))
  rows[6]!.text = ''
  rows[8]!.options[1]!.isCorrect = true
  rows[9]!.options[1]!.text = ' да '
  const skippedQuestions = rows.slice(6).map((row, index) => ({
    rowNumber: index + 7,
    questionText: row.text,
    reasonCode: 'game_question.import_invalid_fields',
    reason: 'Invalid options or required fields.',
    sourceQuestion: row,
  }))
  let uploaded = ''
  await page.route('**/api/game/questions/import', async (route) => {
    uploaded = route.request().postDataBuffer()!.toString('utf8')
    expect(route.request().headers()['content-type']).toMatch(/^multipart\/form-data; boundary=/)
    state.items.push(
      ...rows.slice(0, 6).map((row, index) => ({
        ...catalog[0]!,
        ...row,
        questionId: 'imported-' + index,
        questionCode: row.externalCode,
        categoryId: row.categoryId ?? 'system',
        categoryName: row.categoryId ? 'География' : 'БЕЗ КАТЕГОРИИ',
        isEnabled: false,
        options: row.options.map((option, position) => ({
          ...option,
          optionId: 'option-' + index + '-' + position,
          sortOrder: position,
        })),
      })),
    )
    state.categories.find((c) => c.id === 'geo')!.questionCount += 3
    state.categories.find((c) => c.id === 'system')!.questionCount += 3
    await route.fulfill({ json: { importedCount: 6, skippedQuestions } })
  })
  await page.goto('/panel/catalog-questions')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'ten-questions.jsonc',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ questions: rows })),
  })
  await expect(page.getByText('Импортировано вопросов: 6. Пропущено: 4.')).toBeVisible()
  await expect(page.getByTestId('question-catalog-list').getByRole('button')).toHaveCount(30)
  expect(uploaded).toContain('filename="ten-questions.jsonc"')
  expect(uploaded).toContain('Импортированный вопрос 1')
  await expect(page.getByText(/#8 - Импортированный вопрос 8:/)).toBeVisible()
  await expect(
    page.getByText(/Проверьте текст вопроса, неотрицательную награду/).first(),
  ).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Скачать отчёт', exact: true }).click()
  const download = await downloadPromise
  const report = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(report.sourceFileName).toBe('ten-questions.jsonc')
  expect(report.importedCount).toBe(6)
  expect(report.skippedQuestions.map((row: { rowNumber: number }) => row.rowNumber)).toEqual([
    7, 8, 9, 10,
  ])
  expect(report.skippedQuestions[3].sourceQuestion.options).toEqual(rows[9]!.options)
  await page.screenshot({ path: info.outputPath('import-partial-result.png') })
})

test('failed JSON import leaves the catalog intact and the same file can be retried while controls block duplicate uploads', async ({
  page,
}) => {
  await mockCatalog(page)
  let attempts = 0
  let release = () => {}
  await page.route('**/api/game/questions/import', async (route) => {
    attempts++
    if (attempts === 1)
      return route.fulfill({
        status: 400,
        json: { code: 'game_question.invalid_request', message: 'Invalid JSON' },
      })
    await new Promise<void>((resolve) => {
      release = resolve
    })
    return route.fulfill({ json: { importedCount: 0, skippedQuestions: [] } })
  })
  await page.goto('/panel/catalog-questions')
  const file = {
    name: 'retry.jsonc',
    mimeType: 'application/json',
    buffer: Buffer.from('{"questions":[]}'),
  }
  await page.locator('input[type="file"]').setInputFiles(file)
  await expect(
    page.getByRole('alert').filter({ has: page.getByRole('button', { name: 'Скачать отчёт' }) }),
  ).toBeVisible()
  await expect(page.getByTestId('question-catalog-list').getByRole('button')).toHaveCount(24)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Скачать отчёт' }).click()
  const report = JSON.parse(await readFile((await (await downloadPromise).path())!, 'utf8'))
  expect(report.sourceFileName).toBe('retry.jsonc')
  expect(report.importedCount).toBe(0)
  expect(report.errorMessage).toBeTruthy()
  await page.locator('input[type="file"]').setInputFiles(file)
  await expect.poll(() => attempts).toBe(2)
  await expect(page.getByRole('button', { name: 'Развернуть импорт из JSON' })).toBeDisabled()
  release()
  await expect(page.getByText('Импортировано вопросов: 0.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Развернуть импорт из JSON' })).toBeEnabled()
  await expect(page.getByTestId('question-catalog-list').getByRole('button')).toHaveCount(24)
})
