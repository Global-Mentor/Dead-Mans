import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import { AuthContext, type AuthContextValue } from '../../shared/auth/auth-context.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { AdminModifierTool } from './AdminModifierPanel.tsx'
import { currentGameBoardQueryOptions } from '../game-board/index.ts'

const apiMocks = vi.hoisted(() => ({
  fetchAdminGameModifierPlayers: vi.fn(),
  fetchGameModifierCatalog: vi.fn(),
  fetchCurrentGameBoardSnapshot: vi.fn(),
  fetchAdminGameModifierState: vi.fn(),
  fetchAdminActiveGameModifierActivations: vi.fn(),
  cancelGameModifierActivation: vi.fn(),
  emergencyDisableGameModifier: vi.fn(),
}))

vi.mock('./api/game-modifiers-api.ts', async () => {
  const actual = await vi.importActual<typeof import('./api/game-modifiers-api.ts')>(
    './api/game-modifiers-api.ts',
  )

  return {
    ...actual,
    fetchAdminGameModifierPlayers: apiMocks.fetchAdminGameModifierPlayers,
    fetchGameModifierCatalog: apiMocks.fetchGameModifierCatalog,
    fetchAdminGameModifierState: apiMocks.fetchAdminGameModifierState,
    fetchAdminActiveGameModifierActivations: apiMocks.fetchAdminActiveGameModifierActivations,
    cancelGameModifierActivation: apiMocks.cancelGameModifierActivation,
    emergencyDisableGameModifier: apiMocks.emergencyDisableGameModifier,
  }
})

const adminAuthContext: AuthContextValue = {
  user: {
    id: 'admin-1',
    displayName: 'Admin',
    roles: ['admin'],
  },
  authStatus: 'authenticated',
  isAuthenticated: true,
  startTwitchLogin: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  refreshSession: vi.fn().mockResolvedValue(true),
}

vi.mock('../game-board/api/game-board-data-access.ts', async () => ({
  ...(await vi.importActual('../game-board/api/game-board-data-access.ts')),
  fetchCurrentGameBoardSnapshot: apiMocks.fetchCurrentGameBoardSnapshot,
}))

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

beforeEach(() => {
  apiMocks.fetchCurrentGameBoardSnapshot.mockResolvedValue({
    gameId: 'game-1',
    title: 'Game',
    status: 'active',
    version: 1,
    rows: 1,
    cols: 1,
    cells: [],
    rowLabels: [],
    colLabels: [],
    enabledModifierIds: ['modifier-1'],
    activeModifiers: [],
  })
  apiMocks.fetchGameModifierCatalog.mockImplementation(async () =>
    (await apiMocks.fetchAdminGameModifierState()).availableModifiers.map(
      (item: { modifier: unknown }) => item.modifier,
    ),
  )
  apiMocks.fetchAdminGameModifierPlayers.mockResolvedValue({
    players: [
      {
        userId: 'player-1',
        login: 'player_one',
        displayName: 'Player One',
        availableQuizPoints: 17,
      },
    ],
    summary: {
      playersCount: 1,
      totalAvailableQuizPoints: 17,
      totalEarnedQuizPoints: 20,
      totalSpentQuizPoints: 3,
    },
  })
  apiMocks.fetchAdminActiveGameModifierActivations.mockResolvedValue([])
  apiMocks.cancelGameModifierActivation.mockResolvedValue(undefined)
  apiMocks.emergencyDisableGameModifier.mockResolvedValue(undefined)
  apiMocks.fetchAdminGameModifierState.mockResolvedValue({
    availableQuizPoints: 17,
    spentQuizPoints: 3,
    earnedQuizPoints: 20,
    isOrderingOpen: true,
    activeModifiers: [],
    availableModifiers: [
      {
        modifier: {
          id: 'modifier-1',
          category: 'round',
          name: 'Расходники',
          description: 'Описание модификатора',
          activationCost: 3,
          activationLimit: { count: 3 },
          conflictingModifierIds: [],
          iconEmoji: null,
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
          isLockedByActiveGame: true,
        },
        isActive: false,
        canActivate: true,
        blockedReason: null,
        activationsCount: 0,
        limit: 3,
        isEmergencyDisabled: false,
        emergencyDisabledAtUtc: null,
      },
    ],
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AdminModifierPanel quick wins', () => {
  it('omits the player counter and redundant instruction', async () => {
    renderPanel()

    expect(await screen.findByRole('combobox', { name: 'Игрок' })).toHaveValue('Player One')

    expect(screen.getByRole('heading', { name: /Добавить модификатор/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Отменить модификатор/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Остановить модификатор/ })).toBeInTheDocument()

    expect(screen.queryByText('1 игроков')).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'Отдельно добавляйте модификатор игроку или отменяйте неиспользованную активацию с возвратом очков.',
      ),
    ).not.toBeInTheDocument()
  })

  it('searches the hidden Twitch login while displaying only the player name', async () => {
    renderPanel()
    const picker = await screen.findByRole('combobox', { name: 'Игрок' })
    await waitFor(() => expect(picker).toHaveValue('Player One'))
    fireEvent.change(picker, { target: { value: 'player_one' } })
    const option = within(await screen.findByRole('listbox')).getByRole('option')
    expect(option).toHaveTextContent('Player One')
    expect(option).not.toHaveTextContent('player_one')
  })

  it('shows only the modifier name and price in the modifier dropdown', async () => {
    renderPanel()
    expect(await screen.findByRole('combobox', { name: 'Игрок' })).toHaveValue('Player One')

    const modifierSelect = await screen.findByRole('combobox', { name: 'Модификатор' })
    fireEvent.mouseDown(modifierSelect)

    const listbox = await screen.findByRole('listbox')
    const option = within(listbox).getByRole('option')
    expect(option).toHaveTextContent('Расходники')
    expect(option).toHaveTextContent('3 очк.')
    expect(within(option).queryByText('Во время раунда')).not.toBeInTheDocument()
    expect(within(option).queryByText('Не участвует в итогах')).not.toBeInTheDocument()
  })

  it('counts every activation, shows earned points, and closes the refund dialog after success', async () => {
    let activations = [
      {
        activationId: 'activation-1',
        roundId: 'round-1',
        roundVersion: 3,
        modifierId: 'modifier-1',
        modifierName: 'Расходники',
        activatedByUserId: 'player-1',
        activatedByDisplayName: 'Player One',
        activationCost: 3,
        activatedAtUtc: '2026-08-13T18:00:00Z',
      },
      {
        activationId: 'activation-2',
        roundId: 'round-1',
        roundVersion: 3,
        modifierId: 'modifier-1',
        modifierName: 'Расходники',
        activatedByUserId: 'player-1',
        activatedByDisplayName: 'Player One',
        activationCost: 3,
        activatedAtUtc: '2026-08-13T18:05:00Z',
      },
    ]
    activations.push({
      ...activations[1]!,
      activationId: 'activation-other-owner',
      activatedByUserId: 'player-2',
      activatedByDisplayName: 'Player Two',
      activatedAtUtc: '2026-08-13T18:10:00Z',
    })
    apiMocks.fetchAdminActiveGameModifierActivations.mockImplementation(async () => activations)
    apiMocks.cancelGameModifierActivation.mockImplementation(async (activationId: string) => {
      activations = activations.filter((activation) => activation.activationId !== activationId)
    })

    renderPanel()

    const usedMetric = await screen.findByRole('group', {
      name: 'Активации',
    })
    await waitFor(() => expect(within(usedMetric).getByText('3')).toBeInTheDocument())
    const earnedMetric = screen.getByRole('group', { name: 'Заработано' })
    expect(within(earnedMetric).getByText('20 очк.')).toBeInTheDocument()

    const cancellation = screen.getByRole('region', { name: 'Отменить модификатор' })
    fireEvent.mouseDown(within(cancellation).getByRole('combobox', { name: 'Модификатор' }))
    expect(within(await screen.findByRole('listbox')).getAllByRole('option')).toHaveLength(1)
    expect(await screen.findByRole('option', { name: /Расходники/ })).toHaveTextContent('×3')
    fireEvent.click(await screen.findByRole('option', { name: /Расходники/ }))
    expect(screen.getByRole('button', { name: 'Отменить и вернуть очки' })).toBeDisabled()
    fireEvent.mouseDown(within(cancellation).getByRole('combobox', { name: 'Игрок' }))
    const owners = await screen.findByRole('listbox')
    expect(within(owners).getAllByRole('option')).toHaveLength(2)
    fireEvent.click(within(owners).getByRole('option', { name: 'Player One', exact: true }))
    expect(screen.queryByRole('combobox', { name: 'Какая активация' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Причина отмены' }), {
      target: { value: 'Ошибочная покупка' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Отменить и вернуть очки' }))

    const confirmDialog = screen.getByRole('dialog', { name: 'Отменить эту активацию?' })
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Отменить и вернуть очки' }))

    await waitFor(() => expect(apiMocks.cancelGameModifierActivation).toHaveBeenCalledTimes(1))
    expect(apiMocks.cancelGameModifierActivation).toHaveBeenCalledWith(
      'activation-2',
      3,
      'Ошибочная покупка',
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Отменить эту активацию?' }),
      ).not.toBeInTheDocument(),
    )
    await waitFor(() => expect(within(usedMetric).getByText('2')).toBeInTheDocument())
  })

  it('requires a reason and confirmation before emergency-disabling new activations', async () => {
    renderPanel()
    expect(await screen.findByRole('combobox', { name: 'Игрок' })).toHaveValue('Player One')

    fireEvent.click(screen.getByRole('button', { name: 'Остановить модификатор' }))
    const stopping = screen.getByRole('region', { name: 'Остановить модификатор' })
    fireEvent.mouseDown(within(stopping).getByRole('combobox', { name: 'Модификатор' }))
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option'))
    const disableButton = screen.getByRole('button', { name: 'Отключить новые активации' })
    expect(disableButton).toBeDisabled()

    fireEvent.change(screen.getByRole('textbox', { name: 'Причина аварийного отключения' }), {
      target: { value: 'Обнаружена ошибка правила' },
    })
    expect(disableButton).toBeEnabled()
    fireEvent.click(disableButton)

    const confirmDialog = screen.getByRole('dialog', { name: 'Отключить новые активации?' })
    expect(confirmDialog).toHaveTextContent('Существующие активации и история не изменятся')
    fireEvent.click(
      within(confirmDialog).getByRole('button', { name: 'Отключить новые активации' }),
    )

    await waitFor(() =>
      expect(apiMocks.emergencyDisableGameModifier).toHaveBeenCalledWith(
        'modifier-1',
        'Обнаружена ошибка правила',
      ),
    )
    expect(await screen.findByText('Новые активации отключены для этой игры.')).toBeInTheDocument()
  })
  it('does not apply an open emergency confirmation to a replacement game', async () => {
    const { queryClient } = renderPanel()
    const dialog = await openEmergencyConfirmation()
    apiMocks.fetchCurrentGameBoardSnapshot.mockResolvedValue({
      ...(await apiMocks.fetchCurrentGameBoardSnapshot()),
      gameId: 'game-2',
    })
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: currentGameBoardQueryOptions.queryKey })
    })
    const confirm = within(dialog).getByRole('button', { name: 'Отключить новые активации' })
    await waitFor(() => expect(confirm).toBeDisabled())
    expect(dialog).toHaveTextContent('Текущая игра изменилась')
    fireEvent.click(confirm)
    expect(apiMocks.emergencyDisableGameModifier).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('retains the emergency target and reason after failure and blocks duplicate submission', async () => {
    let rejectRequest!: (error: Error) => void
    apiMocks.emergencyDisableGameModifier.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject
        }),
    )
    renderPanel()
    const dialog = await openEmergencyConfirmation()
    const confirm = within(dialog).getByRole('button', { name: 'Отключить новые активации' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    await waitFor(() => expect(apiMocks.emergencyDisableGameModifier).toHaveBeenCalledTimes(1))
    expect(confirm).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Отмена' })).toBeDisabled()
    await act(async () => rejectRequest(new Error('Unavailable')))
    await waitFor(() => expect(confirm).toBeEnabled())
    expect(dialog).toHaveTextContent('Расходники')
    fireEvent.click(confirm)
    await waitFor(() => expect(apiMocks.emergencyDisableGameModifier).toHaveBeenCalledTimes(2))
    expect(apiMocks.emergencyDisableGameModifier).toHaveBeenLastCalledWith(
      'modifier-1',
      'Обнаружена ошибка правила',
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

async function openEmergencyConfirmation() {
  await screen.findByRole('combobox', { name: 'Игрок' })
  fireEvent.click(screen.getByRole('button', { name: 'Остановить модификатор' }))
  const stopping = screen.getByRole('region', { name: 'Остановить модификатор' })
  fireEvent.mouseDown(within(stopping).getByRole('combobox', { name: 'Модификатор' }))
  fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option'))
  fireEvent.change(screen.getByRole('textbox', { name: 'Причина аварийного отключения' }), {
    target: { value: 'Обнаружена ошибка правила' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Отключить новые активации' }))
  return screen.getByRole('dialog', { name: 'Отключить новые активации?' })
}

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const rendered = renderWithAppProviders(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={adminAuthContext}>
        <AdminModifierTool />
      </AuthContext.Provider>
    </QueryClientProvider>,
  )

  return {
    ...rendered,
    queryClient,
  }
}
