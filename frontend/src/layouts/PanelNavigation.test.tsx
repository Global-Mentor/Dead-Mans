import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ThemeProvider } from '@mui/material'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { gameSetupDraftQueryOptions } from '../features/game-setup/index.ts'
import { currentGameBoardQueryOptions } from '../features/game-board/index.ts'
import { gameNotificationsQueryOptions } from '../features/game-notifications/api/game-notification-queries.ts'
import {
  gameRegistrationAdminSnapshotQueryOptions,
  gameRegistrationSnapshotQueryOptions,
} from '../features/game-registration/index.ts'
import { createLoadedDraftState } from '../features/game-setup/model/game-setup-query-state.ts'
import type {
  GameUserNotification,
  GameRegistrationAdminSnapshot,
  GameRegistrationSnapshot,
  GameSetupSnapshot,
} from '../shared/api/contracts/index.ts'
import i18n from '../i18n.ts'
import { appTheme } from '../app/theme/appTheme.ts'
import { AuthContext } from '../shared/auth/auth-context.ts'
import type { AuthContextValue, AuthUser } from '../shared/auth/auth-context.ts'
import { PanelNavigation } from './PanelNavigation.tsx'

vi.mock('../shared/realtime/index.ts', () => ({
  realtimeHubs: {
    gameBoard: {
      events: {
        userNotificationCreated: 'userNotificationCreated',
      },
    },
  },
  useSignalrHubSubscription: vi.fn(),
}))

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

afterEach(() => {
  cleanup()
})

function renderNavigation(
  user: AuthUser,
  initialPath = '/panel/game-board',
  draftSnapshot: GameSetupSnapshot | null = createDraftSnapshot(),
  registrationSnapshot: GameRegistrationSnapshot | null = null,
  adminRegistrationSnapshot: GameRegistrationAdminSnapshot | null = null,
  currentGameStatus?: 'ready' | 'active' | 'finished' | null,
  gameNotifications: GameUserNotification[] = [],
) {
  const resolvedGameStatus =
    currentGameStatus ?? (registrationSnapshot || adminRegistrationSnapshot ? 'ready' : null)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  })
  const authValue: AuthContextValue = {
    user,
    authStatus: 'authenticated',
    isAuthenticated: true,
    startTwitchLogin: vi.fn(),
    logout: vi.fn(async () => undefined),
    refreshSession: vi.fn(async () => true),
  }

  queryClient.setQueryData(
    gameSetupDraftQueryOptions.queryKey,
    createLoadedDraftState(draftSnapshot),
  )
  queryClient.setQueryData(
    currentGameBoardQueryOptions.queryKey,
    resolvedGameStatus == null
      ? null
      : {
          gameId: 'game-1',
          title: 'Current game',
          description: null,
          status: resolvedGameStatus,
          version: 1,
          rows: 1,
          cols: 1,
          rowLabels: ['A'],
          colLabels: ['1'],
          cells: [],
          enabledModifierIds: [],
          activeModifiers: [],
        },
  )
  queryClient.setQueryData(gameRegistrationSnapshotQueryOptions.queryKey, registrationSnapshot)
  queryClient.setQueryData(
    gameRegistrationAdminSnapshotQueryOptions.queryKey,
    adminRegistrationSnapshot,
  )
  queryClient.setQueryData(gameNotificationsQueryOptions.queryKey, gameNotifications)

  function Providers({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={appTheme}>
            <MemoryRouter initialEntries={[initialPath]}>
              <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
            </MemoryRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </I18nextProvider>
    )
  }

  return {
    queryClient,
    ...render(<PanelNavigation />, { wrapper: Providers }),
  }
}

function createDraftSnapshot(): GameSetupSnapshot {
  return {
    gameId: 'draft-1',
    title: 'Draft game',
    description: null,
    status: 'draft',
    version: 1,
    rows: 1,
    cols: 1,
    rowLabels: ['100'],
    colLabels: ['A'],
    cells: [
      {
        id: 'cell-1',
        row: 0,
        col: 0,
        cellType: 'question',
        title: null,
        description: null,
        cost: 100,
        state: 'closed',
        media: [],
      },
    ],
    enabledModifierIds: [],
    enabledQuestionIds: [],
  } as GameSetupSnapshot
}

describe('PanelNavigation', () => {
  it('keeps the primary navigation focused on player tasks', () => {
    renderNavigation({
      id: 'viewer-1',
      displayName: 'Player',
      roles: ['viewer'],
    })

    const navigation = screen.getByRole('navigation', { name: 'Основная навигация' })

    for (const label of ['Игра', 'Лидерборд', 'Подать заявку', 'Модификаторы', 'Викторина']) {
      expect(within(navigation).getByRole('link', { name: label })).toBeInTheDocument()
    }

    fireEvent.click(within(navigation).getByRole('button', { name: 'История' }))
    expect(screen.getByRole('menuitem', { name: 'История игр' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'История модификаторов' })).toBeInTheDocument()
  })

  it('shows an invitation bell with the pending invite count', () => {
    renderNavigation(
      {
        id: 'viewer-1',
        displayName: 'Player',
        roles: ['viewer'],
      },
      '/panel/game-board',
      createDraftSnapshot(),
      {
        gameId: 'game-1',
        gameStatus: 'ready',
        minPlayersPerTeam: 1,
        maxPlayersPerTeam: 2,
        teamSlots: [],
        teams: [],
        myTeam: null,
        myPendingInvitations: [
          {
            invitationId: 'inv-1',
            teamSlotId: 'slot-1',
            teamSlotIndex: 1,
            teamId: 'team-1',
            status: 'pending',
            createdAtUtc: '2026-06-11T12:00:00Z',
            invitedByDisplayName: 'Captain One',
            invitedUserDisplayName: 'Player',
          },
        ],
        myOutgoingInvitations: [],
        canInvitePlayersToMyTeam: false,
        invitablePlayers: [],
      },
    )

    expect(screen.getByRole('button', { name: 'Открыть уведомления' })).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Открыть уведомления' }))

    expect(
      screen.getByRole('menuitem', { name: /Captain One пригласил вас в команду/i }),
    ).toBeInTheDocument()
  })

  it('shows important disband requests in the notification bell for admins', () => {
    renderNavigation(
      {
        id: 'admin-1',
        displayName: 'Admin',
        roles: ['admin'],
      },
      '/panel/game-board',
      createDraftSnapshot(),
      null,
      {
        gameId: 'game-1',
        gameStatus: 'ready',
        minPlayersPerTeam: 1,
        maxPlayersPerTeam: 2,
        teamSlots: [
          {
            teamSlotId: 'slot-1',
            teamSlotIndex: 1,
            teamSlotType: 'public',
            reservedLabel: null,
            isAvailableForNewTeam: false,
            teamId: 'team-1',
            teamStatus: 'confirmed',
          },
        ],
        teams: [
          {
            teamId: 'team-1',
            teamSlotIndex: 1,
            teamSlotType: 'public',
            reservedLabel: null,
            recruitmentOpen: false,
            status: 'confirmed',
            disbandRequestedAtUtc: '2026-06-11T12:00:00Z',
            disbandRequestedByUserId: 'user-1',
            disbandRequestedByDisplayName: 'Player One',
            members: [],
          },
        ],
        availablePlayers: [],
      },
    )

    expect(screen.getByText('1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Открыть уведомления' }))

    expect(
      screen.getByRole('menuitem', { name: /Player One просит распустить команду/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Очередь 1/i)).toBeInTheDocument()
  })

  it('shows modifier cancellation notifications for players', () => {
    renderNavigation(
      {
        id: 'viewer-1',
        displayName: 'Player',
        roles: ['viewer'],
      },
      '/panel/game-board',
      createDraftSnapshot(),
      null,
      null,
      'active',
      [
        {
          notificationId: 'notif-1',
          type: 'modifier_cancelled',
          createdAtUtc: '2026-07-21T12:00:00Z',
          modifierName: 'Расходники',
          actorDisplayName: 'Администратор',
          quizPointsDelta: 3,
        },
      ],
    )

    expect(screen.getByText('1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Открыть уведомления' }))

    expect(
      screen.getByRole('menuitem', { name: /Модификатор «Расходники» отменён/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/вернул вам 3 очк/i)).toBeInTheDocument()
  })

  it('keeps player registration notifications idle but staff team notifications available when active', () => {
    const adminSnapshot = {
      gameId: 'game-1',
      gameStatus: 'active',
      minPlayersPerTeam: 1,
      maxPlayersPerTeam: 2,
      teamSlots: [],
      teams: [],
      availablePlayers: [],
    }
    const { queryClient } = renderNavigation(
      {
        id: 'admin-1',
        displayName: 'Admin',
        roles: ['admin'],
      },
      '/panel/game-board',
      createDraftSnapshot(),
      null,
      adminSnapshot,
      'active',
    )

    expect(
      queryClient.getQueryState(gameRegistrationSnapshotQueryOptions.queryKey)?.fetchStatus,
    ).toBe('idle')
    expect(queryClient.getQueryData(gameRegistrationAdminSnapshotQueryOptions.queryKey)).toBe(
      adminSnapshot,
    )
  })

  it('hides the application navigation item while the current game is active', () => {
    renderNavigation(
      {
        id: 'viewer-1',
        displayName: 'Player',
        roles: ['viewer'],
      },
      '/panel/game-board',
      createDraftSnapshot(),
      null,
      null,
      'active',
    )

    const navigation = screen.getByRole('navigation', { name: 'Основная навигация' })

    expect(within(navigation).getByRole('link', { name: 'Игра' })).toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: 'Лидерборд' })).toBeInTheDocument()
    expect(
      within(navigation).queryByRole('link', { name: 'Подать заявку' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the nickname menu limited to profile-related actions', () => {
    renderNavigation({
      id: 'admin-1',
      displayName: 'Admin',
      roles: ['admin', 'viewer'],
    })

    fireEvent.click(screen.getByRole('button', { name: /Admin/ }))

    const profileMenu = screen.getByRole('menu')
    expect(within(profileMenu).getByText('Профиль')).toBeInTheDocument()
    expect(within(profileMenu).getByText('Роли доступа')).toBeInTheDocument()
    expect(within(profileMenu).getByText('Администратор')).toBeInTheDocument()
    expect(within(profileMenu).getByText('Участник')).toBeInTheDocument()
    expect(
      within(profileMenu).getByRole('combobox', { name: 'Язык интерфейса' }),
    ).toBeInTheDocument()
    expect(within(profileMenu).getByRole('menuitem', { name: 'Выйти' })).toBeInTheDocument()
    expect(within(profileMenu).queryByText('Настройка доски')).not.toBeInTheDocument()
    expect(within(profileMenu).queryByText('Команды')).not.toBeInTheDocument()
  })

  it('collects every available admin form in one administration dropdown', () => {
    renderNavigation(
      {
        id: 'admin-1',
        displayName: 'Admin',
        roles: ['admin'],
      },
      '/panel/game-setup',
    )

    const navigation = screen.getByRole('navigation', { name: 'Навигация администратора' })
    const trigger = within(navigation).getByRole('button', { name: 'Администрирование' })

    expect(within(navigation).getAllByRole('button')).toHaveLength(1)
    fireEvent.click(trigger)

    for (const label of [
      'Настройка доски',
      'Команды',
      'Модификаторы текущей игры',
      'Вопросы текущей игры',
      'Каталог модификаторов',
      'Каталог вопросов',
    ]) {
      expect(screen.getByRole('menuitem', { name: label })).toBeInTheDocument()
    }

    expect(screen.queryByRole('menuitem', { name: 'Роли пользователей' })).not.toBeInTheDocument()
  })

  it('shows role administration only to super administrators', () => {
    renderNavigation(
      {
        id: 'superadmin-1',
        displayName: 'Super Admin',
        roles: ['superadmin'],
      },
      '/panel/role-administration',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Администрирование' }))

    expect(screen.getByRole('menuitem', { name: 'Роли пользователей' })).toBeInTheDocument()
  })

  it('limits the administration dropdown to team management for moderators', () => {
    renderNavigation({
      id: 'moderator-1',
      displayName: 'Moderator',
      roles: ['moderator'],
    })

    fireEvent.click(screen.getByRole('button', { name: 'Администрирование' }))

    expect(screen.getByRole('menuitem', { name: 'Команды' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Настройка доски' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Каталог вопросов' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Роли пользователей' })).not.toBeInTheDocument()
  })

  it('does not render administration navigation for regular players', () => {
    renderNavigation({
      id: 'viewer-1',
      displayName: 'Player',
      roles: ['viewer'],
    })

    expect(
      screen.queryByRole('navigation', { name: 'Навигация администратора' }),
    ).not.toBeInTheDocument()
  })

  it('disables current-game modifiers and questions when there is no draft game', () => {
    renderNavigation(
      {
        id: 'admin-1',
        displayName: 'Admin',
        roles: ['admin'],
      },
      '/panel/game-setup',
      null,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Администрирование' }))

    expect(screen.getByRole('menuitem', { name: 'Настройка доски' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByRole('menuitem', { name: 'Модификаторы текущей игры' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByRole('menuitem', { name: 'Вопросы текущей игры' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })
})
