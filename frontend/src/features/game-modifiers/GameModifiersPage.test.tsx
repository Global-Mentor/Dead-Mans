import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import { AuthContext, type AuthContextValue } from '../../shared/auth/auth-context.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { currentGameBoardQueryOptions } from '../game-board/index.ts'
import { activeGameRoundQueryOptions } from '../game-rounds/api/game-rounds-queries.ts'
import { GameModifiersPage } from './GameModifiersPage.tsx'
import { GameModifierActions } from './ui/GameModifierActions.tsx'
import { gameModifierStateQueryOptions } from './api/game-modifier-queries.ts'

const modifierMocks = vi.hoisted(() => ({
  useActivateGameModifier: vi.fn(),
  selfCancelGameModifierActivation: vi.fn(),
}))

vi.mock('@tanstack/react-query', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')

  return {
    ...actual,
    useQuery: vi.fn(),
  }
})

vi.mock('./use-activate-game-modifier.ts', () => ({
  useActivateGameModifier: modifierMocks.useActivateGameModifier,
}))

vi.mock('./api/game-modifiers-api.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/game-modifiers-api.ts')>()
  return {
    ...actual,
    selfCancelGameModifierActivation: modifierMocks.selfCancelGameModifierActivation,
  }
})

const mockedUseQuery = vi.mocked(useQuery)

const authContextValue: AuthContextValue = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    displayName: 'Player One',
    roles: ['viewer'],
  },
  authStatus: 'authenticated',
  isAuthenticated: true,
  startTwitchLogin: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  refreshSession: vi.fn().mockResolvedValue(true),
}

function renderGameModifiersPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return renderWithAppProviders(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authContextValue}>
        <GameModifiersPage />
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

function createState() {
  return {
    gameId: 'game-1',
    availableQuizPoints: 24,
    spentQuizPoints: 9,
    earnedQuizPoints: 33,
    isOrderingOpen: true,
    activeModifiers: [
      {
        activationId: 'activation-1',
        roundId: 'round-1',
        roundVersion: 1,
        modifierId: 'modifier-1',
        modifierName: 'Расходники',
        activatedByUserId: 'user-1',
        activatedByDisplayName: 'Player One',
        activationCost: 3,
        activatedAtUtc: '2026-07-21T18:01:00Z',
      },
      {
        activationId: 'activation-2',
        roundId: 'round-1',
        roundVersion: 1,
        modifierId: 'modifier-1',
        modifierName: 'Расходники',
        activatedByUserId: 'user-2',
        activatedByDisplayName: 'Player Two',
        activationCost: 3,
        activatedAtUtc: '2026-07-21T18:02:00Z',
      },
      {
        activationId: 'activation-3',
        roundId: 'round-1',
        roundVersion: 1,
        modifierId: 'modifier-1',
        modifierName: 'Расходники',
        activatedByUserId: 'user-3',
        activatedByDisplayName: 'Player Three',
        activationCost: 3,
        activatedAtUtc: '2026-07-21T18:03:00Z',
      },
    ],
    availableModifiers: [
      {
        modifier: {
          id: 'modifier-1',
          category: 'round' as const,
          name: 'Расходники',
          description: 'Описание модификатора',
          activationCost: 3,
          activationLimit: { count: 3 },
          conflictingModifierIds: [],
          iconEmoji: '🧰',
          activationCommand: null,
          revision: 1,
          normalizedTags: [],
          behaviorV2: {
            schemaVersion: 2,
            kind: 'rule',
            phase: 'round',
            performer: 'activeTeam',
            requiresHostMonitoring: false,
            rule: 'Test rule',
            stackingPolicy: 'aggregateParameters',
            resolution: { type: 'ruleStatus' },
            reward: 'none',
            formulaReference: null,
          },
        },
        isActive: true,
        canActivate: true,
        blockedReason: null,
        activationsCount: 3,
        limit: 3,
      },
    ],
  }
}

const currentSnapshot = {
  gameId: 'game-1',
  title: 'Тестовая игра',
  status: 'active' as const,
  version: 1,
  rows: 1,
  cols: 1,
  rowLabels: ['Сложность'],
  colLabels: ['Категория'],
  cells: [
    {
      id: 'cell-1',
      row: 0,
      col: 0,
      cellType: 'regular',
      title: 'Битва в порту',
      description: null,
      cost: 500,
      state: 'open' as const,
      media: [],
    },
  ],
  enabledModifierIds: ['modifier-1'],
  activeModifiers: [],
  activeTeamId: 'team-1',
}

const currentRound = {
  roundId: 'round-1',
  gameId: 'game-1',
  cellId: 'cell-1',
  teamId: 'team-1',
  teamName: 'Морские волки',
  teamSlotIndex: 2,
  status: 'awaiting_modifiers',
  startedAtUtc: '2026-08-14T18:00:00Z',
  finishedAtUtc: null,
  baseScore: 0,
  finalScore: null,
  emptyCardPenaltyApplied: false,
  scoreDetails: {
    baseScore: 0,
    bountyScore: 0,
    modifierScore: 0,
    penaltyTotal: 0,
    finalScore: 0,
  },
  killsCount: 0,
  bountyCount: 0,
  notes: null,
  participants: [
    { userId: 'team-user-1', displayName: 'Капитан Флинт' },
    { userId: 'team-user-2', displayName: 'Энн Бонни' },
  ],
  modifierResults: [],
}

function mockPageQueries({
  modifierState = createState(),
  snapshot = currentSnapshot,
  activeRound = currentRound,
}: {
  modifierState?: ReturnType<typeof createState> | null
  snapshot?: typeof currentSnapshot | null
  activeRound?: typeof currentRound | null
} = {}) {
  mockedUseQuery.mockImplementation((options) => {
    const queryKey = options.queryKey
    const data =
      queryKey === gameModifierStateQueryOptions.queryKey
        ? modifierState
        : queryKey === currentGameBoardQueryOptions.queryKey
          ? snapshot
          : queryKey === activeGameRoundQueryOptions.queryKey
            ? activeRound
            : undefined

    return {
      isLoading: false,
      isError: false,
      data,
    } as ReturnType<typeof useQuery>
  })
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

beforeEach(() => {
  mockPageQueries()
  modifierMocks.selfCancelGameModifierActivation.mockResolvedValue(undefined)
  modifierMocks.useActivateGameModifier.mockReturnValue({
    isActivating: false,
    pendingModifierId: null,
    activateAsync: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
    errorMessage: null,
    toastMessage: null,
    dismissToast: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('GameModifiersPage', () => {
  it('keeps confirmation copy stable during refresh and when ordering closes', async () => {
    const state = createState()
    const client = new QueryClient()
    const content = (disabled: boolean) => (
      <QueryClientProvider client={client}>
        <AuthContext.Provider value={authContextValue}>
          <GameModifierActions state={state} roundId="round-1" disabled={disabled}>
            {(actions) => (
              <button onClick={() => actions.requestActivation('modifier-1')}>Activate</button>
            )}
          </GameModifierActions>
        </AuthContext.Provider>
      </QueryClientProvider>
    )
    const { rerender } = renderWithAppProviders(content(false))
    fireEvent.click(screen.getByRole('button', { name: 'Activate' }))
    const dialog = screen.getByRole('dialog', { name: 'Активировать этот модификатор?' })
    const description = dialog.textContent
    const confirm = within(dialog).getByRole('button', { name: 'Активировать', exact: true })

    rerender(content(true))
    expect(confirm).toBeDisabled()
    expect(dialog.textContent).toBe(description)
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    rerender(content(false))
    expect(confirm).toBeEnabled()

    state.isOrderingOpen = false
    rerender(content(false))
    expect(dialog.textContent).toBe(description)
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    await waitFor(() => expect(dialog).not.toBeInTheDocument())
  })

  it('shows no active game state without treating it as a load error', () => {
    mockPageQueries({ modifierState: null, snapshot: null, activeRound: null })

    renderGameModifiersPage()

    expect(
      screen.getByText('Активной игры нет. Модификаторы появятся после старта.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Не удалось загрузить модификаторы.')).not.toBeInTheDocument()
  })

  it('shows the current team and active card in the existing summary', () => {
    renderGameModifiersPage()

    const summary = screen.getByRole('region', { name: 'Краткая сводка' })
    expect(within(summary).getByRole('status')).toHaveTextContent('Заказ открыт')
    expect(screen.getByTestId('modifier-summary-row')).toHaveStyle({
      display: 'grid',
    })
    expect(within(summary).getByText('Текущая команда')).toBeInTheDocument()
    expect(within(summary).getByText('Морские волки')).toBeInTheDocument()
    expect(within(summary).queryByText('Участники команды')).not.toBeInTheDocument()
    expect(within(summary).getByText('Капитан Флинт')).toBeInTheDocument()
    expect(within(summary).getByText('Энн Бонни')).toBeInTheDocument()
    expect(within(summary).getByText('Активная карточка')).toBeInTheDocument()
    expect(within(summary).getByText('Битва в порту')).toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: /^Просмотр карточки/ })).toBeVisible()
    expect(within(summary).queryByRole('button', { expanded: false })).not.toBeInTheDocument()
    expect(within(summary).getByRole('list')).toHaveStyle({ flexDirection: 'column' })

    const pointsMetric = within(summary).getByRole('group', { name: 'Доступно очков' })
    expect(pointsMetric).toHaveAttribute('tabindex', '0')
    expect(pointsMetric.querySelector('dt')).toHaveTextContent('Доступно очков')
    expect(pointsMetric.querySelector('dd')).not.toBeEmptyDOMElement()
    const viewCardButton = within(summary).getByRole('button', { name: /^Просмотр карточки/ })
    expect(viewCardButton).toBeEnabled()
    expect(viewCardButton).toHaveTextContent('Просмотр карточки')
    expect(viewCardButton).not.toHaveTextContent('Битва в порту')
    expect(viewCardButton).toHaveStyle({ borderRadius: '0px' })

    expect(screen.queryByRole('heading', { name: 'Модификаторы' })).not.toBeInTheDocument()
    const summaryText = summary.textContent ?? ''
    expect(summaryText.indexOf('Статус заказа')).toBeLessThan(summaryText.indexOf('Доступно очков'))
    expect(summaryText.indexOf('Статус заказа')).toBeLessThan(
      summaryText.indexOf('Текущая команда'),
    )
    expect(summaryText.indexOf('Текущая команда')).toBeLessThan(
      summaryText.indexOf('Активная карточка'),
    )
  })

  it('opens the active card in the shared card preview dialog', () => {
    renderGameModifiersPage()

    fireEvent.click(screen.getByRole('button', { name: /^Просмотр карточки/ }))

    const dialog = screen.getByRole('dialog', { name: 'Битва в порту' })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('У этой карточки нет прикреплённых медиа.')).toBeInTheDocument()
    expect(
      within(dialog).getByText('Карточка открыта, но итоги раунда ещё не подведены.'),
    ).toBeInTheDocument()
  })

  it('shows neutral round context when no card is active', () => {
    mockPageQueries({ activeRound: null })

    renderGameModifiersPage()

    const summary = screen.getByRole('region', { name: 'Краткая сводка' })
    expect(within(summary).getByText('Не выбрана')).toBeInTheDocument()
    expect(within(summary).getByText('Участники не указаны')).toBeInTheDocument()
    expect(within(summary).getByText('Не открыта')).toBeInTheDocument()
    expect(within(summary).queryByRole('button', { name: /^Просмотр карточки/ })).toBeNull()
  })

  it('shows grouped activator display names for regular users', () => {
    renderGameModifiersPage()

    expect(screen.getByTestId('game-modifiers-page')).toBeInTheDocument()
    expect(screen.getAllByText('Расходники')).toHaveLength(2)
    expect(screen.getByText('Player Three')).toBeInTheDocument()
    expect(screen.getByText('Player Two')).toBeInTheDocument()
    expect(screen.getByText('Player One')).toBeInTheDocument()
    expect(screen.getByText('Активировали:')).toBeInTheDocument()
    expect(screen.getByText('Потрачено вами')).toBeInTheDocument()
    expect(screen.getByText('Потрачено за раунд')).toBeInTheDocument()
    expect(screen.getAllByText('9 очк.')).toHaveLength(2)
    expect(screen.getAllByText('Активны в этой игре')).toHaveLength(1)
    expect(screen.getByText('3 модификатора')).toBeInTheDocument()
    const available = screen.getByTestId('available-modifiers-section')
    expect(within(available).queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
    expect(within(available).queryByText('1 модификатор', { exact: true })).not.toBeInTheDocument()
    expect(
      within(available).getByRole('region', { name: 'Доступны в этой игре', exact: true }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('available-modifiers-section')).getByRole('heading', {
        name: 'Во время раунда',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText('1 модификаторов')).not.toBeInTheDocument()
    expect(screen.queryByText('Текущий игрок')).not.toBeInTheDocument()
    expect(screen.queryByText(/Последний:/)).not.toBeInTheDocument()
    expect(screen.queryByText('Что уже действует прямо сейчас.')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Выберите следующий модификатор без отдельного экрана деталей.'),
    ).not.toBeInTheDocument()
  })

  it('uses correct Russian modifier count forms', () => {
    expect(i18n.t('gameModifiers.categoryCountLabel', { count: 1 })).toBe('1 модификатор')
    expect(i18n.t('gameModifiers.categoryCountLabel', { count: 2 })).toBe('2 модификатора')
    expect(i18n.t('gameModifiers.categoryCountLabel', { count: 5 })).toBe('5 модификаторов')
  })

  it('explains every summary metric in plain language', () => {
    renderGameModifiersPage()

    const metrics = [
      {
        label: 'Доступно очков',
        tooltip:
          'Очки викторины, которые вы можете потратить сейчас: заработанные за эту игру очки минус ваши расходы на модификаторы.',
      },
      {
        label: 'Потрачено вами',
        tooltip: 'Все очки викторины, которые вы потратили на модификаторы за текущую игру.',
      },
      {
        label: 'Потрачено за раунд',
        tooltip:
          'Сумма стоимости всех модификаторов, активных в текущем раунде, независимо от того, кто их активировал.',
      },
      {
        label: 'Статус заказа',
        tooltip:
          'Показывает, можно ли сейчас заказывать модификаторы. Заказ открыт только в нужной фазе раунда.',
      },
      {
        label: 'Текущая команда',
        tooltip: 'Команда, которая сейчас играет, и участники этого раунда.',
      },
      {
        label: 'Активная карточка',
        tooltip:
          'Карточка, которая сейчас разыгрывается. Кнопка «Просмотр карточки» открывает её полностью.',
      },
    ]

    for (const metric of metrics) {
      const metricElement = screen.getByText(metric.label, { selector: 'dt' }).closest('[tabindex]')
      if (!metricElement) {
        throw new Error(`Metric container not found: ${metric.label}`)
      }

      expect(metricElement).toHaveAttribute('title', metric.tooltip)
    }

    for (const focusableLabel of [
      'Доступно очков',
      'Потрачено вами',
      'Потрачено за раунд',
      'Статус заказа',
      'Текущая команда',
    ]) {
      expect(
        screen.getByText(focusableLabel, { selector: 'dt' }).closest('[tabindex]'),
      ).toHaveAttribute('tabindex', '0')
    }
  })

  it('retains activation content until the cancelled dialog finishes closing', async () => {
    renderGameModifiersPage()
    const activate = modifierMocks.useActivateGameModifier.mock.results.at(-1)?.value.activateAsync
    const activateButton = screen.getByRole('button', { name: 'Активировать Расходники' })
    fireEvent.click(activateButton)
    const dialog = screen.getByRole('dialog', { name: 'Активировать этот модификатор?' })
    const content = dialog.textContent

    fireEvent.click(within(dialog).getByRole('button', { name: 'Отмена', exact: true }))

    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveTextContent(content ?? '')
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(activate).not.toHaveBeenCalled()
    await waitFor(() => expect(dialog).not.toBeInTheDocument())

    fireEvent.click(activateButton)
    expect(
      within(screen.getByRole('dialog', { name: 'Активировать этот модификатор?' })).getByText(
        'Активировать «Расходники» за 3 очк. викторины?',
      ),
    ).toBeInTheDocument()
  })

  it.each(['unavailable', 'removed'])(
    'retains successful activation content when the modifier becomes %s during exit',
    async (nextState) => {
      const state = createState()
      mockPageQueries({ modifierState: state })
      renderGameModifiersPage()
      const activate =
        modifierMocks.useActivateGameModifier.mock.results.at(-1)?.value.activateAsync
      activate.mockImplementation(async () => {
        if (nextState === 'removed') state.availableModifiers = []
        else {
          for (const item of state.availableModifiers) item.canActivate = false
        }
      })
      fireEvent.click(screen.getByRole('button', { name: 'Активировать Расходники' }))
      const dialog = screen.getByRole('dialog', { name: 'Активировать этот модификатор?' })
      const content = dialog.textContent

      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Активировать', exact: true }))
      })

      expect(dialog).toBeInTheDocument()
      expect(dialog.textContent).toBe(content)
      expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
      await waitFor(() => expect(dialog).not.toBeInTheDocument())
      expect(activate).toHaveBeenCalledOnce()
    },
  )

  it('asks for confirmation before activating a modifier', async () => {
    renderGameModifiersPage()
    const activate = modifierMocks.useActivateGameModifier.mock.results.at(-1)?.value.activateAsync
    const activateButton = screen.getByRole('button', { name: 'Активировать Расходники' })

    expect(activateButton).toHaveStyle({
      minHeight: '36px',
      borderRadius: '0px',
    })

    fireEvent.click(activateButton)

    expect(activate).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Активировать этот модификатор?' })
    expect(
      within(dialog).getByText('Активировать «Расходники» за 3 очк. викторины?'),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Отмена', exact: true })).toBeVisible()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Активировать', exact: true }))

    expect(activate).toHaveBeenCalledWith('modifier-1')
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Активировать этот модификатор?' }),
      ).not.toBeInTheDocument(),
    )
  })

  it('keeps a disabled cancellation for activations owned by other users', async () => {
    renderGameModifiersPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Активные · 3' }))
    const cancel = screen.getByRole('button', { name: 'Отменить активацию: Расходники' })
    expect(cancel).toBeDisabled()
    fireEvent.click(cancel)
    expect(modifierMocks.selfCancelGameModifierActivation).not.toHaveBeenCalled()
    fireEvent.mouseOver(cancel.parentElement!)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Можно отменить только свою активацию.',
    )
  })

  it('offers one cancellation for multiple own activations and cancels only the latest one', async () => {
    const state = createState()
    const ownedActivation = state.activeModifiers[0]
    if (!ownedActivation) {
      throw new Error('Expected an activation fixture')
    }
    ownedActivation.activatedByUserId = authContextValue.user?.id ?? ''
    ownedActivation.roundVersion = 7
    const latestOwnedActivation = state.activeModifiers[1]!
    latestOwnedActivation.activatedByUserId = authContextValue.user?.id ?? ''
    latestOwnedActivation.roundVersion = 7
    mockPageQueries({ modifierState: state })

    renderGameModifiersPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Активные · 3' }))
    const refundButtons = screen.getAllByRole('button', { name: 'Отменить активацию: Расходники' })
    expect(refundButtons).toHaveLength(1)
    const refund = refundButtons[0]!
    expect(refund).toHaveTextContent('Отменить')
    fireEvent.click(refund)

    const dialog = screen.getByRole('dialog', { name: 'Отменить покупку модификатора?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Отменить покупку и вернуть очки' }))

    await waitFor(() =>
      expect(modifierMocks.selfCancelGameModifierActivation).toHaveBeenCalledWith(
        'activation-2',
        7,
      ),
    )
    expect(modifierMocks.selfCancelGameModifierActivation).toHaveBeenCalledTimes(1)
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Отменить покупку модификатора?' }),
      ).not.toBeInTheDocument(),
    )
  })

  it('shows a compact ordering status with a detailed tooltip', async () => {
    const state = createState()
    state.isOrderingOpen = false
    const availability = state.availableModifiers[0]
    if (!availability) {
      throw new Error('Expected the base modifier fixture')
    }
    availability.canActivate = false
    availability.blockedReason = 'ordering_closed'
    mockPageQueries({ modifierState: state })

    renderGameModifiersPage()

    const summary = screen.getByRole('region', { name: 'Краткая сводка' })
    const orderingAlert = within(summary).getByRole('status')
    expect(orderingAlert).toHaveTextContent('Заказ закрыт')
    expect(orderingAlert).toHaveAccessibleName('Статус заказа')
    expect(within(orderingAlert).queryByRole('button')).not.toBeInTheDocument()
    expect(orderingAlert).toHaveAttribute('tabindex', '0')
    expect(orderingAlert).toHaveAttribute('title', 'Сейчас не фаза заказа модификаторов.')
    fireEvent.mouseOver(orderingAlert)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Сейчас не фаза заказа модификаторов.',
    )
    fireEvent.mouseLeave(orderingAlert)
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
    expect(screen.getByText('Заказ закрыт: сейчас не фаза заказа модификаторов.')).not.toBeVisible()
    const blockedButton = screen.getByRole('status', {
      name: 'Заказ закрыт: сейчас не фаза заказа модификаторов.',
    })
    expect(screen.queryByRole('button', { name: 'Недоступно' })).not.toBeInTheDocument()
    expect(blockedButton).toHaveStyle({ minHeight: '36px' })
    expect(blockedButton.parentElement).toHaveAttribute('tabindex', '0')
    fireEvent.mouseOver(blockedButton.parentElement as HTMLElement)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Заказ закрыт: сейчас не фаза заказа модификаторов.',
    )
  })

  it('shows a compact conflict status and names its cause in the tooltip and details', async () => {
    const state = createState()
    const baseAvailability = state.availableModifiers[0]
    if (!baseAvailability) {
      throw new Error('Expected the base modifier fixture')
    }

    state.availableModifiers.push({
      ...baseAvailability,
      modifier: {
        ...baseAvailability.modifier,
        id: 'modifier-2',
        name: 'Конфликтный модификатор',
        conflictingModifierIds: ['modifier-1'],
      },
      isActive: false,
      canActivate: false,
      blockedReason: 'conflict_active',
      activationsCount: 0,
    })
    mockPageQueries({ modifierState: state })

    renderGameModifiersPage()

    const blockedStatus = screen.getByRole('status', {
      name: 'Заблокирован конфликтом с: Расходники',
    })
    expect(blockedStatus).toHaveStyle({ minHeight: '36px' })
    expect(within(blockedStatus).getByText('Конфликт')).toBeVisible()
    expect(screen.queryByText('Есть конфликт')).not.toBeInTheDocument()
    expect(blockedStatus.parentElement).toHaveAttribute('tabindex', '0')
    fireEvent.mouseOver(blockedStatus)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Заблокирован конфликтом с: Расходники',
    )
    const detailsButton = within(
      screen.getByRole('listitem', { name: 'Конфликтный модификатор' }),
    ).getByRole('button', { name: 'Подробнее' })
    expect(detailsButton).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(detailsButton as HTMLElement)
    await waitFor(() => expect(detailsButton).toHaveAttribute('aria-expanded', 'true'))
    const conflicts = screen.getByRole('region', { name: 'Несовместимые модификаторы' })
    expect(within(conflicts).getByText('Расходники')).toHaveAttribute('title', 'Активирован')
    expect(within(conflicts).queryByText('Активирован')).not.toBeInTheDocument()
    expect(conflicts).toHaveTextContent('Конфликты: Расходники')
  })

  it('shows a compact active-team status with a detailed tooltip', async () => {
    const state = createState()
    for (const availability of state.availableModifiers) {
      availability.canActivate = false
      availability.blockedReason = 'active_team_member'
    }
    mockPageQueries({ modifierState: state })

    renderGameModifiersPage()

    const blockedStatus = screen.getByRole('status', {
      name: 'Ваша команда сейчас играет этот раунд - активировать модификаторы для неё нельзя.',
    })
    expect(within(blockedStatus).getByText('Недоступно')).toBeVisible()
    expect(screen.queryByText('Ваша команда играет')).not.toBeInTheDocument()
    expect(blockedStatus.parentElement).toHaveAttribute('tabindex', '0')
    fireEvent.mouseOver(blockedStatus)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Ваша команда сейчас играет этот раунд - активировать модификаторы для неё нельзя.',
    )
  })

  it.each([
    ['limit_reached', 'Лимит исчерпан', 'Лимит активаций исчерпан.'],
    ['insufficient_points', 'Не хватает очков', 'Не хватает очков викторины.'],
  ] as const)(
    'shows the compact %s status with its detailed tooltip',
    async (blockedReason, label, explanation) => {
      const state = createState()
      const availability = state.availableModifiers[0]
      if (!availability) {
        throw new Error('Expected the base modifier fixture')
      }
      availability.canActivate = false
      availability.blockedReason = blockedReason
      mockPageQueries({ modifierState: state })

      renderGameModifiersPage()

      const blockedStatus = screen.getByRole('status', { name: explanation })
      expect(blockedStatus).toHaveTextContent(
        blockedReason === 'limit_reached' ? label : 'Недоступно',
      )
      if (blockedReason !== 'limit_reached')
        expect(screen.queryByText(label)).not.toBeInTheDocument()
      else expect(screen.queryByText(explanation)).not.toBeInTheDocument()
      fireEvent.mouseOver(blockedStatus)
      expect(await screen.findByRole('tooltip')).toHaveTextContent(explanation)
    },
  )
})
