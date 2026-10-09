import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../../i18n.ts'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { ModifierFormDialog } from './ModifierFormDialog.tsx'

const apiMocks = vi.hoisted(() => ({ previewGameModifier: vi.fn() }))

vi.mock('../api/catalog-modifiers-api.ts', () => ({
  previewGameModifier: apiMocks.previewGameModifier,
}))

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

beforeEach(() => {
  apiMocks.previewGameModifier.mockResolvedValue({
    name: 'Новое правило',
    description: 'Описание правила',
    iconEmoji: null,
    activationCommand: '!активировать новое правило',
    normalizedTags: ['бой'],
    behaviorV2: {
      schemaVersion: 2,
      kind: 'rule',
      phase: 'round',
      performer: 'activeTeam',
      requiresHostMonitoring: false,
      rule: 'Выполнить правило.',
      stackingPolicy: 'aggregateParameters',
      resolution: { type: 'ruleStatus' },
      reward: 'none',
      formulaReference: null,
    },
    example: {
      cardValue: 100,
      killsCount: 3,
      bountyCount: 1,
      resolutionExample: 'completed',
      pointsDelta: 0,
      bonusKillsDelta: 0,
      finalScore: 400,
    },
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

function renderDialog(onClose = vi.fn()) {
  renderWithAppProviders(
    <ModifierFormDialog
      open
      mode="create"
      modifiers={[]}
      isBusy={false}
      onClose={onClose}
      onSubmit={vi.fn()}
    />,
  )
  return onClose
}

function fillCard() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Название' }), {
    target: { value: 'Новое правило' },
  })
  fireEvent.change(screen.getByRole('textbox', { name: 'Описание' }), {
    target: { value: 'Описание правила' },
  })
}

describe('ModifierFormDialog', () => {
  it('skips the impact step for a rule and loads the backend review', async () => {
    renderDialog()
    fillCard()
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))

    await screen.findByText('Шаг 2 из 3')
    expect(
      screen.queryByRole('textbox', { name: /Правило|Команда активации/ }),
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Стоимость активации' }), {
      target: { value: '0' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))

    await waitFor(() => expect(apiMocks.previewGameModifier).toHaveBeenCalledTimes(1))
    expect(screen.getByText('Шаг 3 из 3')).toBeInTheDocument()
    expect(await screen.findByText('Карточка игрока')).toBeInTheDocument()
    expect(screen.queryByLabelText('Что изменяется')).not.toBeInTheDocument()
  }, 20_000)

  it('builds scoring through gameplay questions and derives the technical configuration', async () => {
    renderDialog()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Что делает модификатор?' }))
    fireEvent.click(screen.getByRole('option', { name: 'Влияет на итог раунда' }))
    fillCard()
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))

    await screen.findByRole('spinbutton', { name: 'Стоимость активации' })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Стоимость активации' }), {
      target: { value: '0' },
    })
    expect(
      screen.queryByRole('spinbutton', { name: 'Длительность, секунд' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))

    expect(await screen.findByText('От чего срабатывает модификатор?')).toBeInTheDocument()
    expect(apiMocks.previewGameModifier).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('radio', { name: 'Убийства команды' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Только подходящие убийства' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Что должен ввести ведущий?' }), {
      target: { value: 'Убийства до восстановления здоровья' },
    })
    fireEvent.click(screen.getByRole('radio', { name: /Процент стоимости карточки/i }))
    expect(screen.getByRole('spinbutton', { name: 'Процент карточки за единицу' })).toHaveValue(
      null,
    )
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Процент карточки за единицу' }), {
      target: { value: '75' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))

    await waitFor(() => expect(apiMocks.previewGameModifier).toHaveBeenCalledTimes(1))
    expect(apiMocks.previewGameModifier).toHaveBeenCalledWith(
      expect.objectContaining({
        behaviorV2: expect.objectContaining({
          reward: 'points',
          resolution: expect.objectContaining({
            type: 'nonNegativeCount',
            maximumKind: 'resolvedKills',
          }),
          formulaReference: expect.objectContaining({
            code: 'card_percent_per_unit',
            parameters: { type: 'cardPercentPerUnit', rate: 0.75 },
          }),
        }),
      }),
    )
  })

  it('provides a focused tooltip for every field on the first step', () => {
    renderDialog()

    expect(
      screen.getByRole('button', { name: /Что делает модификатор.*Выберите правило/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Название.*Отображается игрокам/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Описание.*Полное объяснение/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Иконка.*Необязательная иконка/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /Теги/ })).not.toBeInTheDocument()
  })

  it('uses a full-screen dialog on a mobile viewport', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('max-width'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )

    renderDialog()

    expect(screen.getByRole('dialog')).toHaveClass('MuiDialog-paperFullScreen')
  })

  it('asks for confirmation before discarding a dirty draft', async () => {
    const onClose = renderDialog()
    const nameField = screen.getByRole('textbox', { name: 'Название' })
    fireEvent.input(nameField, { target: { value: 'Новое правило' } })
    fireEvent.blur(nameField)
    await waitFor(() => expect(nameField).toHaveValue('Новое правило'))
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))

    const confirmation = await screen.findByRole('dialog', {
      name: 'Отменить несохранённые изменения?',
    })
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Сбросить' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps locked content read-only without exposing a save action', () => {
    renderWithAppProviders(
      <ModifierFormDialog
        open
        mode="edit"
        modifiers={[]}
        isBusy={false}
        isReadOnly
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Просмотр модификатора')
    expect(screen.getByRole('textbox', { name: 'Название' })).toBeDisabled()
    expect(screen.getByText(/доступно только для просмотра/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Сохранить' })).not.toBeInTheDocument()
  })

  it('prevents duplicate preview requests and closing while reviewing the draft', async () => {
    const preview = await apiMocks.previewGameModifier()
    apiMocks.previewGameModifier.mockClear()
    let finishPreview!: (value: typeof preview) => void
    apiMocks.previewGameModifier.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPreview = resolve
        }),
    )
    const onClose = renderDialog()
    fillCard()
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
    await screen.findByRole('spinbutton', { name: 'Стоимость активации' })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Стоимость активации' }), {
      target: { value: '0' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
    await waitFor(() => expect(apiMocks.previewGameModifier).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'Назад' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()
    fireEvent.submit(document.getElementById('catalog-modifier-wizard-form')!)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })
    expect(apiMocks.previewGameModifier).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    finishPreview(preview)
    expect(await screen.findByText('Карточка игрока')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeEnabled()
  })

  it('keeps the draft and shows a retryable error when loading the latest revision fails', async () => {
    const onLoadLatest = vi.fn().mockRejectedValue(new Error('private diagnostic'))
    renderWithAppProviders(
      <ModifierFormDialog
        open
        mode="edit"
        modifiers={[]}
        isBusy={false}
        hasStaleConflict
        onLoadLatest={onLoadLatest}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    const name = screen.getByRole('textbox', { name: 'Название' })
    fireEvent.change(name, { target: { value: 'Несохранённое правило' } })
    const load = screen.getByRole('button', { name: 'Загрузить актуальную для сравнения' })
    fireEvent.click(load)
    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible())
    expect(name).toHaveValue('Несохранённое правило')
    expect(screen.queryByText('private diagnostic')).not.toBeInTheDocument()
    expect(load).toBeEnabled()
    onLoadLatest.mockResolvedValue(undefined)
    fireEvent.click(load)
    await waitFor(() => expect(onLoadLatest).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('preserves the local draft and offers the latest revision after a stale conflict', async () => {
    const onLoadLatest = vi.fn().mockResolvedValue(undefined)
    renderWithAppProviders(
      <ModifierFormDialog
        open
        mode="edit"
        modifiers={[]}
        isBusy={false}
        hasStaleConflict
        onLoadLatest={onLoadLatest}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    const nameField = screen.getByRole('textbox', { name: 'Название' })
    fireEvent.change(nameField, { target: { value: 'Мой несохранённый черновик' } })

    fireEvent.click(screen.getByRole('button', { name: 'Загрузить актуальную для сравнения' }))

    await waitFor(() => expect(onLoadLatest).toHaveBeenCalledTimes(1))
    expect(nameField).toHaveValue('Мой несохранённый черновик')
    expect(screen.getByText(/локальный черновик сохранён/i)).toBeInTheDocument()
  })
})
