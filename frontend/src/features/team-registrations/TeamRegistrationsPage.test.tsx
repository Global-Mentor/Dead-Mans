import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { TeamRegistrationsPage } from './TeamRegistrationsPage.tsx'

const pageMocks = vi.hoisted(() => ({
  useTeamRegistrationsPage: vi.fn(),
  roles: ['moderator'] as string[],
}))

vi.mock('../../shared/auth/use-auth.ts', () => ({
  useAuth: () => ({ user: { roles: pageMocks.roles } }),
}))

vi.mock('./use-team-registrations-page.ts', () => ({
  useTeamRegistrationsPage: pageMocks.useTeamRegistrationsPage,
}))

function createPageController(data: unknown, overrides: Record<string, unknown> = {}) {
  return {
    adminSnapshotQuery: {
      isLoading: false,
      isError: false,
      data,
    },
    createAdminTeam: { isPending: false, mutate: vi.fn() },
    createAdminInvitation: { isPending: false, variables: undefined, mutate: vi.fn() },
    assignPlayerToTeam: { isPending: false, mutate: vi.fn() },
    removePlayerFromTeam: { isPending: false, variables: undefined, mutate: vi.fn() },
    cancelTeamInvitation: { isPending: false, variables: undefined, mutate: vi.fn() },
    moveTeamToSlot: { isPending: false, mutate: vi.fn() },
    unconfirmTeam: { isPending: false, variables: undefined, mutate: vi.fn() },
    confirmTeam: { isPending: false, variables: undefined, mutate: vi.fn() },
    rejectTeam: { isPending: false, variables: undefined, mutate: vi.fn() },
    disbandTeam: { isPending: false, variables: undefined, mutate: vi.fn() },
    updateTeamName: { isPending: false, variables: undefined, mutate: vi.fn() },
    teamPlayedState: {
      isUpdatingPlayedState: false,
      updatingTeamId: null,
      setTeamPlayedState: vi.fn(),
      getErrorMessage: vi.fn(),
      toastMessage: null,
      dismissToast: vi.fn(),
    },
    toastMessage: null,
    dismissToast: vi.fn(),
    ...overrides,
  }
}

function renderPage() {
  const result = renderWithAppProviders(<TeamRegistrationsPage />)
  const team = screen.queryAllByRole('button', { name: /^Управление:/ })[0]
  if (team) fireEvent.click(team)
  return result
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

beforeEach(() => {
  pageMocks.roles = ['moderator']
  pageMocks.useTeamRegistrationsPage.mockReturnValue(createPageController(null))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('TeamRegistrationsPage', () => {
  it('requires a ready roster and confirms refusal before notifying its members', () => {
    const rejectTeam = { isPending: false, variables: undefined, mutate: vi.fn() }
    const team = {
      teamId: 'team-1',
      name: 'Ночной дозор',
      teamSlotIndex: 1,
      teamSlotType: 'public',
      recruitmentOpen: true,
      status: 'forming',
      isReady: true,
      isActiveInGame: false,
      isPlayed: false,
      hasOpenedCard: false,
      pendingInvitations: [],
      members: [
        {
          player: { userId: 'u-1', login: 'hunter', displayName: 'Охотник' },
          joinedAtUtc: '2026-10-08T10:00:00Z',
          readyAtUtc: '2026-10-08T10:01:00Z',
        },
      ],
    }
    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController(
        {
          gameId: 'g',
          gameStatus: 'ready',
          minPlayersPerTeam: 1,
          maxPlayersPerTeam: 1,
          teams: [team],
          teamSlots: [
            {
              teamSlotId: 'slot',
              teamSlotIndex: 1,
              teamSlotType: 'public',
              teamId: team.teamId,
              isAvailableForNewTeam: false,
            },
          ],
          availablePlayers: [],
        },
        { rejectTeam },
      ),
    )
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Отклонить', exact: true }))
    expect(rejectTeam.mutate).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Отказать команде в допуске?' })
    expect(dialog).toHaveTextContent('Каждый участник получит уведомление')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Отклонить', exact: true }))
    expect(rejectTeam.mutate).toHaveBeenCalledWith(team.teamId, {
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    })
    cleanup()
    team.members[0]!.readyAtUtc = ''
    renderPage()
    expect(screen.getByRole('button', { name: 'Отклонить', exact: true })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Распустить', exact: true })).toBeEnabled()
  })

  it('renders loading and error states', () => {
    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController(null, {
        adminSnapshotQuery: { isLoading: true, isError: false, data: undefined },
      }),
    )
    renderPage()
    expect(screen.getByText('Загрузка команд...')).toBeInTheDocument()

    cleanup()
    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController(null, {
        adminSnapshotQuery: { isLoading: false, isError: true, data: undefined },
      }),
    )
    renderPage()
    expect(screen.getByText('Не удалось загрузить команды.')).toBeInTheDocument()
  })

  it('shows a clean unavailable state while registration is closed', () => {
    renderPage()

    expect(screen.getByText('Управление командами')).toBeInTheDocument()
    expect(screen.getByText('Приём заявок команд пока не открыт.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders both an empty ready state and actionable team rows', async () => {
    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController({
        gameId: 'game-1',
        gameStatus: 'ready',
        minPlayersPerTeam: 1,
        maxPlayersPerTeam: 2,
        teamSlots: [],
        teams: [],
        availablePlayers: [],
      }),
    )
    renderPage()
    expect(
      screen.getByText('Пока нет команд. Создайте пустой состав и распределите игроков вручную.'),
    ).toBeInTheDocument()

    cleanup()
    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController({
        gameId: 'game-1',
        gameStatus: 'ready',
        minPlayersPerTeam: 1,
        maxPlayersPerTeam: 2,
        teamSlots: [
          {
            teamSlotId: 'slot-1',
            teamSlotIndex: 2,
            teamSlotType: 'public',
            reservedLabel: null,
            isAvailableForNewTeam: false,
            teamId: 'team-1',
            teamStatus: 'forming',
          },
        ],
        teams: [
          {
            teamId: 'team-1',
            teamSlotIndex: 2,
            teamSlotType: 'public',
            reservedLabel: null,
            recruitmentOpen: true,
            status: 'forming',
            members: [
              {
                player: {
                  userId: 'user-1',
                  login: 'player',
                  displayName: 'Player One',
                },
                joinedAtUtc: '2026-06-11T12:00:00Z',
              },
            ],
            pendingInvitations: [
              {
                invitationId: 'inv-1',
                player: {
                  userId: 'user-2',
                  login: 'invited',
                  displayName: 'Invited Player',
                },
                createdAtUtc: '2026-06-11T12:05:00Z',
              },
            ],
          },
        ],
        availablePlayers: [],
      }),
    )
    renderPage()

    expect(
      within(screen.getByTestId('admin-team-details')).getByText('Player One'),
    ).toBeInTheDocument()
    expect(screen.getByText('Invited Player')).toBeInTheDocument()
    expect(screen.getByText('Ожидает подтверждения')).toBeInTheDocument()
    expect(screen.getByTestId('admin-team-details')).not.toHaveTextContent(
      'Перед подтверждением дождитесь ответа на приглашения или отмените их.',
    )
    fireEvent.mouseOver(screen.getByRole('button', { name: 'Готово: Подтвердить' }).parentElement!)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Перед подтверждением дождитесь ответа на приглашения или отмените их.',
    )
    fireEvent.mouseLeave(screen.getByRole('button', { name: 'Готово: Подтвердить' }).parentElement!)
    expect(screen.getByRole('button', { name: 'Готово: Подтвердить' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Отклонить' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Название команды' })).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: 'Другие действия' })).not.toBeInTheDocument()
    const actions = screen.getByRole('group', { name: 'Действия' })
    expect(within(actions).getByRole('button', { name: 'Готово: Подтвердить' })).toBeDisabled()
    expect(within(actions).getByRole('button', { name: 'Отклонить' })).toBeDisabled()
    expect(within(actions).getByRole('button', { name: 'Распустить' })).toBeEnabled()
  })

  it('allows confirming an unready roster but requires a team name', () => {
    const confirmTeam = { isPending: false, variables: undefined, mutate: vi.fn() }
    const namedTeam = {
      teamId: 'team-1',
      name: 'Ночной дозор',
      teamSlotIndex: 1,
      teamSlotType: 'public',
      reservedLabel: null,
      recruitmentOpen: false,
      status: 'forming',
      isPlayed: false,
      isActiveInGame: false,
      isReady: false,
      members: [
        {
          player: { userId: 'user-1', login: 'raven', displayName: 'Ворон' },
          joinedAtUtc: '2026-09-12T10:00:00Z',
          readyAtUtc: null,
        },
      ],
      pendingInvitations: [],
    }
    const snapshot = {
      gameId: 'game-1',
      gameStatus: 'ready',
      minPlayersPerTeam: 1,
      maxPlayersPerTeam: 2,
      launchSummary: {
        canStartGame: false,
        confirmedTeamsCount: 0,
        formingTeamsCount: 1,
        pendingInvitationsCount: 0,
        disbandRequestsCount: 0,
        invalidConfirmedRostersCount: 0,
      },
      teamSlots: [
        {
          teamSlotId: 'slot-1',
          teamSlotIndex: 1,
          teamSlotType: 'public',
          reservedLabel: null,
          isAvailableForNewTeam: false,
          teamId: 'team-1',
          teamStatus: 'forming',
        },
      ],
      teams: [namedTeam],
      availablePlayers: [],
    }
    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController(snapshot, { confirmTeam }),
    )
    renderPage()

    const confirmButton = screen.getByRole('button', { name: 'Готово: Подтвердить' })
    expect(confirmButton).toBeEnabled()
    fireEvent.click(confirmButton)
    expect(confirmTeam.mutate).not.toHaveBeenCalled()
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Подтвердить', exact: true }),
    )
    expect(confirmTeam.mutate).toHaveBeenCalledExactlyOnceWith('team-1', {
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    })

    cleanup()
    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController({ ...snapshot, teams: [{ ...namedTeam, name: null }] }, { confirmTeam }),
    )
    renderPage()
    expect(screen.getByRole('button', { name: 'Готово: Подтвердить' })).toBeDisabled()
  })

  it('shows team creation actions without rendering empty slots', () => {
    const createAdminTeam = { isPending: false, mutate: vi.fn() }
    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController(
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
              isAvailableForNewTeam: true,
              teamId: null,
              teamStatus: null,
            },
          ],
          teams: [],
          availablePlayers: [],
        },
        { createAdminTeam },
      ),
    )

    renderPage()

    expect(screen.queryByText('Слот свободен')).not.toBeInTheDocument()
    fireEvent.click(
      within(screen.getByRole('tablist', { name: 'Управление командами', exact: true })).getByRole(
        'tab',
        { name: 'Команда', exact: true },
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Создать команду', exact: true }))
    expect(screen.getByRole('menuitem', { name: 'Создать открытую команду' })).toBeEnabled()

    fireEvent.click(screen.getByRole('menuitem', { name: 'Создать открытую команду' }))
    expect(createAdminTeam.mutate).toHaveBeenCalledWith({
      recruitmentOpen: true,
      teamSlotId: undefined,
    })
  })

  it('assigns a free player through the team picker', () => {
    const assignPlayerToTeam = { isPending: false, mutate: vi.fn() }

    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController(
        {
          gameId: 'game-1',
          gameStatus: 'ready',
          minPlayersPerTeam: 1,
          maxPlayersPerTeam: 2,
          teamSlots: [
            {
              teamSlotId: 'slot-1',
              teamSlotIndex: 2,
              teamSlotType: 'public',
              reservedLabel: null,
              isAvailableForNewTeam: false,
              teamId: 'team-1',
              teamStatus: 'forming',
            },
          ],
          teams: [
            {
              teamId: 'team-1',
              teamSlotIndex: 2,
              teamSlotType: 'public',
              reservedLabel: null,
              recruitmentOpen: true,
              status: 'forming',
              members: [],
            },
          ],
          availablePlayers: [
            {
              userId: 'user-77',
              login: 'freeplayer',
              displayName: 'Free Player',
            },
          ],
        },
        {
          assignPlayerToTeam,
        },
      ),
    )

    renderPage()

    fireEvent.click(
      within(screen.getByRole('tablist', { name: 'Управление составом' })).getByRole('tab', {
        name: 'Игроки (1)',
        exact: true,
      }),
    )
    fireEvent.click(
      within(screen.getByTestId('admin-player-user-77')).getByRole('button', {
        name: 'Добавить Free Player в команду',
      }),
    )
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'В команду' }))

    expect(assignPlayerToTeam.mutate).toHaveBeenCalledWith(
      {
        teamId: 'team-1',
        userId: 'user-77',
      },
      { onSuccess: expect.any(Function), onError: expect.any(Function) },
    )
  })

  it('sends an admin invitation to an available player for a closed team during an active game', () => {
    const createAdminInvitation = { isPending: false, variables: undefined, mutate: vi.fn() }

    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController(
        {
          gameId: 'game-1',
          gameStatus: 'active',
          minPlayersPerTeam: 1,
          maxPlayersPerTeam: 2,
          teamSlots: [
            {
              teamSlotId: 'slot-1',
              teamSlotIndex: 2,
              teamSlotType: 'reserved',
              reservedLabel: null,
              isAvailableForNewTeam: false,
              teamId: 'team-1',
              teamStatus: 'forming',
            },
          ],
          teams: [
            {
              teamId: 'team-1',
              teamSlotIndex: 2,
              teamSlotType: 'reserved',
              reservedLabel: null,
              recruitmentOpen: false,
              status: 'forming',
              members: [],
              pendingInvitations: [],
            },
          ],
          availablePlayers: [
            {
              userId: 'user-77',
              login: 'candidate',
              displayName: 'Candidate Player',
            },
          ],
        },
        {
          createAdminInvitation,
        },
      ),
    )

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Пригласить игрока' }))
    expect(screen.getByText('Пригласить в команду #2')).toBeInTheDocument()
    expect(screen.getAllByText('Candidate Player')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Candidate Player', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Пригласить' }))

    expect(createAdminInvitation.mutate).toHaveBeenCalledWith(
      {
        teamSlotId: 'slot-1',
        invitedUserId: 'user-77',
        teamId: 'team-1',
      },
      { onSuccess: expect.any(Function), onError: expect.any(Function) },
    )
  })

  it('does not allow admin invitations to open teams', () => {
    const createAdminInvitation = { isPending: false, variables: undefined, mutate: vi.fn() }

    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController(
        {
          gameId: 'game-1',
          gameStatus: 'ready',
          minPlayersPerTeam: 1,
          maxPlayersPerTeam: 2,
          teamSlots: [
            {
              teamSlotId: 'slot-1',
              teamSlotIndex: 2,
              teamSlotType: 'public',
              reservedLabel: null,
              isAvailableForNewTeam: false,
              teamId: 'team-1',
              teamStatus: 'forming',
            },
          ],
          teams: [
            {
              teamId: 'team-1',
              teamSlotIndex: 2,
              teamSlotType: 'public',
              reservedLabel: null,
              recruitmentOpen: true,
              status: 'forming',
              members: [],
              pendingInvitations: [],
            },
          ],
          availablePlayers: [
            {
              userId: 'user-77',
              login: 'candidate',
              displayName: 'Candidate Player',
            },
          ],
        },
        {
          createAdminInvitation,
        },
      ),
    )

    renderPage()

    expect(screen.queryByRole('button', { name: 'Пригласить игрока' })).not.toBeInTheDocument()
    expect(screen.queryByText('Пригласить в команду #2')).not.toBeInTheDocument()
    expect(createAdminInvitation.mutate).not.toHaveBeenCalled()
  })

  it.each(['forming', 'confirmed'])(
    'only allows removing players from a forming roster (%s)',
    (status) => {
      const removePlayerFromTeam = { isPending: false, variables: undefined, mutate: vi.fn() }

      pageMocks.useTeamRegistrationsPage.mockReturnValue(
        createPageController(
          {
            gameId: 'game-1',
            gameStatus: 'ready',
            minPlayersPerTeam: 1,
            maxPlayersPerTeam: 2,
            teamSlots: [
              {
                teamSlotId: 'slot-1',
                teamSlotIndex: 2,
                teamSlotType: 'public',
                reservedLabel: null,
                isAvailableForNewTeam: false,
                teamId: 'team-1',
                teamStatus: status,
              },
            ],
            teams: [
              {
                teamId: 'team-1',
                teamSlotIndex: 2,
                teamSlotType: 'public',
                reservedLabel: null,
                recruitmentOpen: false,
                status,
                members: [
                  {
                    player: {
                      userId: 'user-1',
                      login: 'player',
                      displayName: 'Player One',
                    },
                    joinedAtUtc: '2026-06-11T11:00:00Z',
                  },
                ],
                pendingInvitations: [],
              },
            ],
            availablePlayers: [],
          },
          { removePlayerFromTeam },
        ),
      )

      renderPage()

      if (status === 'confirmed') {
        expect(screen.queryByRole('button', { name: 'Исключить' })).not.toBeInTheDocument()
        expect(
          within(screen.getByTestId('admin-player-user-1')).queryByRole('button', {
            name: /^Переместить/,
          }),
        ).not.toBeInTheDocument()
        expect(removePlayerFromTeam.mutate).not.toHaveBeenCalled()
        return
      }

      fireEvent.click(screen.getByRole('button', { name: 'Действия игрока Player One' }))
      fireEvent.click(screen.getByRole('menuitem', { name: 'Исключить' }))
      expect(screen.getByText('Исключить игрока из команды?')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Исключить игрока' }))

      expect(removePlayerFromTeam.mutate).toHaveBeenCalledWith(
        {
          teamId: 'team-1',
          userId: 'user-1',
        },
        { onSuccess: expect.any(Function), onError: expect.any(Function) },
      )
    },
  )

  it('cancels a pending invitation from the team roster', () => {
    const cancelTeamInvitation = { isPending: false, variables: undefined, mutate: vi.fn() }

    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController(
        {
          gameId: 'game-1',
          gameStatus: 'ready',
          minPlayersPerTeam: 1,
          maxPlayersPerTeam: 2,
          teamSlots: [
            {
              teamSlotId: 'slot-1',
              teamSlotIndex: 2,
              teamSlotType: 'reserved',
              reservedLabel: null,
              isAvailableForNewTeam: false,
              teamId: 'team-1',
              teamStatus: 'forming',
            },
          ],
          teams: [
            {
              teamId: 'team-1',
              teamSlotIndex: 2,
              teamSlotType: 'reserved',
              reservedLabel: null,
              recruitmentOpen: false,
              status: 'forming',
              members: [],
              pendingInvitations: [
                {
                  invitationId: 'inv-1',
                  player: {
                    userId: 'user-2',
                    login: 'invited',
                    displayName: 'Invited Player',
                  },
                  createdAtUtc: '2026-06-11T12:05:00Z',
                },
              ],
            },
          ],
          availablePlayers: [],
        },
        { cancelTeamInvitation },
      ),
    )

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Отменить приглашение' }))

    expect(cancelTeamInvitation.mutate).toHaveBeenCalledWith({
      teamId: 'team-1',
      invitationId: 'inv-1',
    })
  })

  it('moves teams by dragging to define game order', () => {
    const moveTeamToSlot = { isPending: false, mutate: vi.fn() }

    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController(
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
              teamStatus: 'forming',
            },
            {
              teamSlotId: 'slot-2',
              teamSlotIndex: 2,
              teamSlotType: 'public',
              reservedLabel: null,
              isAvailableForNewTeam: false,
              teamId: 'team-2',
              teamStatus: 'forming',
            },
          ],
          teams: [
            {
              teamId: 'team-1',
              teamSlotIndex: 1,
              teamSlotType: 'public',
              reservedLabel: null,
              recruitmentOpen: true,
              status: 'forming',
              members: [],
            },
            {
              teamId: 'team-2',
              teamSlotIndex: 2,
              teamSlotType: 'public',
              reservedLabel: null,
              recruitmentOpen: false,
              status: 'forming',
              members: [],
            },
          ],
          availablePlayers: [],
        },
        { moveTeamToSlot },
      ),
    )

    renderPage()

    const dataTransfer = { effectAllowed: '', setData: vi.fn(), setDragImage: vi.fn() }
    fireEvent.dragStart(screen.getAllByRole('button', { name: /^Порядок:/ })[0], { dataTransfer })
    fireEvent.drop(screen.getByTestId('admin-slot-2'), { dataTransfer })

    expect(moveTeamToSlot.mutate).toHaveBeenCalledWith({
      teamId: 'team-1',
      targetTeamSlotId: 'slot-2',
    })
  })

  it('shows disband requests and asks for confirmation before disbanding a confirmed team', async () => {
    const disbandTeam = { isPending: false, variables: undefined, mutate: vi.fn() }

    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController(
        {
          gameId: 'game-1',
          gameStatus: 'ready',
          minPlayersPerTeam: 1,
          maxPlayersPerTeam: 2,
          teamSlots: [
            {
              teamSlotId: 'slot-1',
              teamSlotIndex: 2,
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
              teamSlotIndex: 2,
              teamSlotType: 'public',
              reservedLabel: null,
              recruitmentOpen: false,
              status: 'confirmed',
              disbandRequestedAtUtc: '2026-06-11T12:00:00Z',
              disbandRequestedByUserId: 'user-1',
              disbandRequestedByDisplayName: 'Player One',
              isActiveInGame: false,
              members: [
                {
                  player: {
                    userId: 'user-1',
                    login: 'player',
                    displayName: 'Player One',
                  },
                  joinedAtUtc: '2026-06-11T11:00:00Z',
                },
              ],
            },
          ],
          availablePlayers: [],
        },
        {
          disbandTeam,
        },
      ),
    )

    renderPage()

    expect(screen.getByRole('combobox', { name: 'Статус' })).toBeInTheDocument()
    fireEvent.mouseOver(
      within(screen.getByTestId('admin-team-details')).getByText('Запрос на роспуск'),
    )
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      /Player One попросил администратора/i,
    )
    fireEvent.mouseLeave(
      within(screen.getByTestId('admin-team-details')).getByText('Запрос на роспуск'),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Распустить' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Распустить команду' }))

    expect(disbandTeam.mutate).toHaveBeenCalledWith('team-1', {
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    })
  })

  it.each([
    {
      isActiveInGame: true,
      isPlayed: false,
      message: 'Команда сейчас активна. Роспуск и отмена подтверждения недоступны.',
    },
    {
      isActiveInGame: false,
      isPlayed: true,
      message:
        'Команда уже открывала карточку или отмечена отыгравшей. Роспуск и отмена подтверждения недоступны.',
    },
  ])(
    'explains why disbanding is blocked ($message)',
    async ({ isActiveInGame, isPlayed, message }) => {
      const disbandTeam = { isPending: false, variables: undefined, mutate: vi.fn() }

      pageMocks.useTeamRegistrationsPage.mockReturnValue(
        createPageController(
          {
            gameId: 'game-1',
            gameStatus: 'active',
            minPlayersPerTeam: 1,
            maxPlayersPerTeam: 2,
            teamSlots: [
              {
                teamSlotId: 'slot-1',
                teamSlotIndex: 2,
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
                teamSlotIndex: 2,
                teamSlotType: 'public',
                reservedLabel: null,
                recruitmentOpen: false,
                status: 'confirmed',
                isActiveInGame,
                isPlayed,
                members: [
                  {
                    player: {
                      userId: 'user-1',
                      login: 'player',
                      displayName: 'Player One',
                    },
                    joinedAtUtc: '2026-06-11T11:00:00Z',
                  },
                ],
                pendingInvitations: [],
              },
            ],
            availablePlayers: [],
          },
          {
            disbandTeam,
          },
        ),
      )

      renderPage()

      const button = screen.getByRole('button', { name: 'Распустить' })
      expect(button).toBeDisabled()
      expect(button.parentElement).toHaveAttribute('tabindex', '0')
      fireEvent.mouseOver(button.parentElement!)
      expect(await screen.findByRole('tooltip')).toHaveTextContent(message)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(disbandTeam.mutate).not.toHaveBeenCalled()
    },
  )

  it.each([
    { status: 'forming', gameStatus: 'ready', empty: true },
    { status: 'forming', gameStatus: 'ready', empty: false },
    { status: 'confirmed', gameStatus: 'active', empty: false },
  ])(
    'disbands an eligible team without a player request ($status, $gameStatus, empty=$empty)',
    ({ status, gameStatus, empty }) => {
      const disbandTeam = { isPending: false, variables: undefined, mutate: vi.fn() }
      const assignPlayerToTeam = { isPending: false, mutate: vi.fn() }
      pageMocks.useTeamRegistrationsPage.mockReturnValue(
        createPageController(
          {
            gameId: 'game-1',
            gameStatus,
            minPlayersPerTeam: 1,
            maxPlayersPerTeam: 2,
            teamSlots: [
              {
                teamSlotId: 'slot-1',
                teamSlotIndex: 2,
                teamSlotType: 'public',
                isAvailableForNewTeam: false,
                teamId: 'team-1',
                teamStatus: status,
              },
            ],
            teams: [
              {
                teamId: 'team-1',
                teamSlotIndex: 2,
                teamSlotType: 'public',
                status,
                recruitmentOpen: true,
                isActiveInGame: false,
                isPlayed: false,
                pendingInvitations: [],
                members: empty
                  ? []
                  : [
                      {
                        player: { userId: 'user-1', login: 'player', displayName: 'Player One' },
                        joinedAtUtc: '2026-06-11T11:00:00Z',
                      },
                    ],
              },
            ],
            availablePlayers: [],
          },
          { disbandTeam, assignPlayerToTeam },
        ),
      )
      renderPage()

      fireEvent.click(screen.getByRole('button', { name: 'Распустить' }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Распустить команду' }))
      expect(disbandTeam.mutate).toHaveBeenCalledWith('team-1', {
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    },
  )
})
