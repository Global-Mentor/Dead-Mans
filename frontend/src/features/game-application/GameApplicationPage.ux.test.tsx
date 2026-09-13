import { act, cleanup, fireEvent, screen, within, waitFor } from '@testing-library/react'
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
    mutateAsync: vi.fn(),
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
    cancelTeamDisbandRequest: mutation(),
    canCancelDisbandRequest: false,
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
  it('uses concise copy for team creation and incoming invitations', () => {
    render(controller(snapshot({ myPendingInvitations: [invitation] })))
    expect(screen.queryByText('Готовый состав подтвердит администратор.')).not.toBeInTheDocument()
    expect(screen.getByText('Вас пригласили в команду.')).toBeInTheDocument()
  })

  it('uses one search instruction and a short outgoing invitation status', () => {
    const mine = team('Закрытая', { recruitmentOpen: false })
    render(
      controller(
        snapshot({
          myTeam: mine,
          teams: [mine],
          canInvitePlayersToMyTeam: true,
          invitablePlayers: [{ userId: 'candidate', login: 'ivan', displayName: 'Ivan Petrov' }],
        }),
      ),
    )
    expect(screen.queryByText(/Выберите свободного игрока/)).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'Введите имя или логин, чтобы пригласить игрока. Поиск работает от 3 символов.',
      ),
    ).toBeInTheDocument()

    cleanup()
    render(
      controller(
        snapshot({
          myTeam: mine,
          teams: [mine],
          myOutgoingInvitations: [
            {
              ...invitation,
              teamId: mine.teamId,
              invitedUserDisplayName: 'Ivan Petrov',
            },
          ],
        }),
      ),
    )
    expect(screen.getByText('Ivan Petrov был приглашён в команду.')).toBeInTheDocument()
    expect(screen.queryByText(/Новое можно отправить после ответа/)).not.toBeInTheDocument()
  })

  it('opens name editing on demand and saves only after an explicit action', async () => {
    const mine = team('Ночной дозор')
    const value = controller(snapshot({ myTeam: mine, teams: [mine] }))
    render(value)
    expect(screen.queryByRole('textbox', { name: 'Название команды' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Изменить название команды' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Название команды' }), {
      target: { value: 'Несохранённое имя' },
    })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Отмена' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(value.updateTeamName.mutateAsync).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Изменить название команды' }))
    expect(screen.getByRole('textbox', { name: 'Название команды' })).toHaveValue('Ночной дозор')
    const saveButton = within(screen.getByRole('dialog')).getByRole('button', { name: 'Сохранить' })
    expect(saveButton).toHaveClass('MuiButton-containedPrimary')
    expect(saveButton).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox', { name: 'Название команды' }), {
      target: { value: '  Охотники  ' },
    })
    fireEvent.click(saveButton)
    expect(value.updateTeamName.mutateAsync).toHaveBeenCalledWith('Охотники')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('requires confirmation before leaving a forming team', async () => {
    const mine = team('Ночной дозор')
    const value = controller(snapshot({ myTeam: mine, teams: [mine] }))
    render(value)

    fireEvent.click(screen.getByRole('button', { name: 'Выйти из команды' }))
    expect(value.leaveTeam.mutateAsync).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Выйти из команды?' })).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Отмена' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(value.leaveTeam.mutateAsync).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Выйти из команды' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Выйти из команды' }),
    )
    expect(value.leaveTeam.mutateAsync).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('keeps the leave confirmation open while pending and allows retry after failure', async () => {
    const mine = team('Ночной дозор')
    const value = controller(snapshot({ myTeam: mine, teams: [mine] }))
    let rejectLeave!: (reason: Error) => void
    value.leaveTeam.mutateAsync
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectLeave = reject
          }),
      )
      .mockResolvedValueOnce(undefined)
    render(value)

    fireEvent.click(screen.getByRole('button', { name: 'Выйти из команды' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Выйти из команды' }),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await act(async () => {
      rejectLeave(new Error('Network error'))
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Выйти из команды' }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(value.leaveTeam.mutateAsync).toHaveBeenCalledTimes(2)
  })

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
    expect(screen.getByText('Всего').nextElementSibling).toHaveTextContent('5')
    expect(screen.getByText('Ищут напарника').nextElementSibling).toHaveTextContent('3')
    expect(screen.getByText('Закрытые').nextElementSibling).toHaveTextContent('1')
    expect(screen.getByText('Готовы к участию').nextElementSibling).toHaveTextContent('1')
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
    expect(screen.getByText('Состав подтверждён')).toBeInTheDocument()
    expect(
      within(screen.getByRole('heading', { name: 'Ваша команда' }).closest('header')!).getByText(
        'Состав подтверждён',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Название команды' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Изменить название команды' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Пригласить напарника')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Вступить' })).not.toBeInTheDocument()
    expect(screen.queryByText('Команду распускает администратор.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Попросить распустить команду' }))
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Отмена' })).toHaveClass(
      'MuiButton-outlinedPrimary',
    )
  })

  it('lets the player retry a failed request', () => {
    const value = controller()
    value.snapshotQuery.isError = true
    render(value)
    fireEvent.click(screen.getByRole('button', { name: 'Попробовать снова' }))
    expect(value.snapshotQuery.refetch).toHaveBeenCalledOnce()
  })

  it('groups confirmed and forming teams and removes redundant slot and own-team labels', () => {
    const mine = team('Моя команда', { status: 'confirmed' })
    render(controller(snapshot({ myTeam: mine, teams: [mine, team('Формируется')] })))
    const readyToggle = screen.getByRole('button', { name: 'Готовы к участию (1 команда)' })
    expect(readyToggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('article', { name: 'Моя команда' })).not.toBeInTheDocument()
    fireEvent.click(readyToggle)
    expect(readyToggle).toHaveAttribute('aria-expanded', 'true')
    expect(
      within(screen.getByRole('region', { name: 'Готовы к участию' })).getByRole('article', {
        name: 'Моя команда',
      }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'В процессе формирования' })).getByRole('article', {
        name: 'Формируется',
      }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('article', { name: 'Моя команда' })).queryByText('Ваша команда'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/^Слот /)).not.toBeInTheDocument()
    expect(screen.queryByText(/^В команде:/)).not.toBeInTheDocument()
    expect(screen.queryByText('2 из 2')).not.toBeInTheDocument()
  })

  it('expands ready teams while searching and collapses them when search is cleared or reset', async () => {
    const confirmed = team('Готовая', {
      status: 'confirmed',
      members: [
        {
          player: { userId: 'hunter', login: 'night-hunter', displayName: 'Охотник' },
          joinedAtUtc: '2026-09-12T10:00:00Z',
        },
      ],
    })
    render(controller(snapshot({ teams: [team('Формируется'), confirmed] })))
    const search = screen.getByRole('searchbox', { name: 'Найти команду или игрока' })
    let readyToggle = screen.getByRole('button', { name: 'Готовы к участию (1 команда)' })
    expect(readyToggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.change(search, { target: { value: 'night-hunter' } })
    expect(readyToggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('article', { name: 'Готовая' })).toBeInTheDocument()

    fireEvent.change(search, { target: { value: '' } })
    expect(readyToggle).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() =>
      expect(screen.queryByRole('article', { name: 'Готовая' })).not.toBeInTheDocument(),
    )

    fireEvent.change(search, { target: { value: 'нет совпадений' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }))
    readyToggle = screen.getByRole('button', { name: 'Готовы к участию (1 команда)' })
    expect(readyToggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('requires confirmation to withdraw a request and leaves it intact when the dialog is dismissed', async () => {
    const value = controller(
      snapshot({
        myTeam: team('Confirmed', {
          status: 'confirmed',
          disbandRequestedAtUtc: '2026-09-12T12:00:00Z',
        }),
      }),
    )
    value.canCancelDisbandRequest = true
    render(value)
    expect(screen.getByText('Запрос на роспуск отправлен')).toBeInTheDocument()
    expect(screen.queryByText('Состав подтверждён')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Отозвать запрос' })).toHaveClass(
      'MuiButton-containedError',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Отозвать запрос' }))
    expect(value.cancelTeamDisbandRequest.mutateAsync).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Отмена' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(value.cancelTeamDisbandRequest.mutateAsync).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Отозвать запрос' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Отозвать запрос' }),
    )
    expect(value.cancelTeamDisbandRequest.mutateAsync).toHaveBeenCalledOnce()
  })

  it('does not offer withdrawing a request made by a teammate', () => {
    render(
      controller(
        snapshot({
          myTeam: team('Confirmed', {
            status: 'confirmed',
            disbandRequestedAtUtc: '2026-09-12T12:00:00Z',
          }),
        }),
      ),
    )
    expect(screen.queryByRole('button', { name: 'Отозвать запрос' })).not.toBeInTheDocument()
    expect(screen.getByText('Отозвать запрос может только его автор.')).toBeInTheDocument()
  })
})
