import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import type {
  GameRegistrationSnapshot,
  RegistrationTeam,
} from '../../shared/api/contracts/index.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { GameApplicationPage } from './GameApplicationPage.tsx'

const mocks = vi.hoisted(() => ({ controller: vi.fn() }))
vi.mock('./use-game-application-page.ts', () => ({ useGameApplicationPage: mocks.controller }))

function team(teamId: string, overrides: Partial<RegistrationTeam> = {}): RegistrationTeam {
  return {
    teamId,
    name: teamId,
    teamSlotIndex: 1,
    teamSlotType: 'public',
    recruitmentOpen: true,
    status: 'forming',
    isPlayed: false,
    isActiveInGame: false,
    pendingInvitations: [],
    members: [
      {
        player: { userId: 'one', login: 'raven', displayName: 'Ворон' },
        joinedAtUtc: '2026-09-12T10:00:00Z',
      },
    ],
    ...overrides,
  }
}
function snapshot(overrides: Partial<GameRegistrationSnapshot> = {}): GameRegistrationSnapshot {
  return {
    gameId: 'game',
    gameStatus: 'ready',
    minPlayersPerTeam: 1,
    maxPlayersPerTeam: 2,
    teamSlots: [
      { teamSlotId: 'slot', teamSlotIndex: 1, teamSlotType: 'public', isAvailableForNewTeam: true },
    ],
    teams: [team('Открытая')],
    myTeam: null,
    myPendingInvitations: [],
    myOutgoingInvitations: [],
    canInvitePlayersToMyTeam: false,
    invitablePlayers: [],
    ...overrides,
  }
}
function controller(data = snapshot()) {
  const mutation = () => ({
    isPending: false,
    variables: undefined as string | undefined,
    mutate: vi.fn(),
  })
  return {
    snapshotQuery: { isLoading: false, isError: false, data, refetch: vi.fn() },
    createTeam: mutation(),
    joinTeam: mutation(),
    leaveTeam: mutation(),
    acceptInvitation: mutation(),
    declineInvitation: mutation(),
    createPlayerInvitation: mutation(),
    cancelPlayerInvitation: mutation(),
    requestTeamDisband: mutation(),
    updateTeamName: mutation(),
    toastMessage: null,
    dismissToast: vi.fn(),
  }
}
function render(controllerValue: ReturnType<typeof controller>) {
  mocks.controller.mockReturnValue(controllerValue)
  return renderWithAppProviders(
    <MemoryRouter>
      <GameApplicationPage />
    </MemoryRouter>,
  )
}
const invitation = {
  invitationId: 'invite',
  teamSlotId: 'slot',
  teamSlotIndex: 1,
  status: 'pending',
  createdAtUtc: '2026-09-12T10:00:00Z',
  invitedByDisplayName: 'Капитан',
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})
beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(cleanup)

describe('Application decisions', () => {
  it('offers joining only where capacity remains, counting reserved invitations', () => {
    const pending = {
      invitationId: 'reserved',
      player: { userId: 'two', login: 'crow', displayName: 'Crow' },
      createdAtUtc: '2026-09-12T10:00:00Z',
    }
    render(
      controller(
        snapshot({
          teams: [
            team('Свободная'),
            team('Полная', {
              members: [
                ...team('a').members,
                ...team('b').members.map((m) => ({ ...m, player: { ...m.player, userId: 'two' } })),
              ],
            }),
            team('Зарезервирована', { pendingInvitations: [pending] }),
            team('Закрытая', { recruitmentOpen: false }),
            team('Подтверждена', { status: 'confirmed' }),
          ],
        }),
      ),
    )
    expect(screen.getByText('Всего: 5 · открыто: 1')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Вступить' })).toHaveLength(1)
    expect(
      within(screen.getByRole('article', { name: 'Свободная' })).getByRole('button', {
        name: 'Вступить',
      }),
    ).toBeEnabled()
    expect(
      within(screen.getByRole('article', { name: 'Зарезервирована' })).getByText('Мест нет'),
    ).toBeInTheDocument()
  })

  it('searches names and logins, combines filters and recovers from no matches', () => {
    render(
      controller(
        snapshot({
          teams: [team('Ночной дозор'), team('Лес', { recruitmentOpen: false, members: [] })],
        }),
      ),
    )
    const search = screen.getByRole('searchbox', { name: 'Найти команду или игрока' })
    fireEvent.change(search, { target: { value: '  RAVEN  ' } })
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('article', { name: 'Ночной дозор' })).toBeInTheDocument()
    fireEvent.change(search, { target: { value: 'лес' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Только открытый набор' }))
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }))
    expect(search).toHaveValue('')
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  it('does not create a team in reserved or occupied slots', () => {
    const value = controller(
      snapshot({
        teamSlots: [
          {
            teamSlotId: 'reserved',
            teamSlotIndex: 1,
            teamSlotType: 'reserved',
            isAvailableForNewTeam: true,
          },
        ],
      }),
    )
    render(value)
    const button = screen.getByRole('button', { name: 'Создать команду' })
    expect(button).toBeDisabled()
    fireEvent.submit(button.closest('form')!)
    expect(value.createTeam.mutate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Вступить' })).toBeEnabled()
  })

  it.each(['createTeam', 'joinTeam', 'acceptInvitation', 'declineInvitation'] as const)(
    'prevents competing actions while %s is pending',
    (key) => {
      const value = controller(snapshot({ myPendingInvitations: [invitation] }))
      value[key].isPending = true
      value[key].variables = key === 'joinTeam' ? 'Открытая' : 'invite'
      render(value)
      for (const name of ['Создать команду', 'Вступить', 'Принять', 'Отклонить']) {
        expect(screen.getByRole('button', { name: new RegExp(name) })).toBeDisabled()
      }
      expect(screen.getByRole('radio', { name: /^Открытая команда/ })).toBeDisabled()
    },
  )

  it('identifies the sender and dispatches the correct invitation', () => {
    const value = controller(snapshot({ myPendingInvitations: [invitation] }))
    render(value)
    expect(screen.getByText('Вас приглашает Капитан')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Принять' }))
    expect(value.acceptInvitation.mutate).toHaveBeenCalledWith('invite', {
      onSuccess: expect.any(Function),
    })
  })

  it('shows confirmed status without editable name or unavailable invitation form', () => {
    render(
      controller(
        snapshot({ myTeam: team('Подтверждена', { status: 'confirmed', recruitmentOpen: false }) }),
      ),
    )
    expect(screen.getByText('Команда подтверждена. Ожидайте начала игры.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Название команды' })).not.toBeInTheDocument()
    expect(screen.queryByText('Пригласить напарника')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Вступить' })).not.toBeInTheDocument()
  })

  it('lets the player retry a failed request', () => {
    const value = controller()
    value.snapshotQuery.isError = true
    render(value)
    fireEvent.click(screen.getByRole('button', { name: 'Попробовать снова' }))
    expect(value.snapshotQuery.refetch).toHaveBeenCalledOnce()
  })
})
