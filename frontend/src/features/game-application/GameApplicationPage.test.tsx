import { cleanup, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { GameApplicationPage } from './GameApplicationPage.tsx'

const pageMocks = vi.hoisted(() => ({
  useGameApplicationPage: vi.fn(),
}))

vi.mock('./use-game-application-page.ts', () => ({
  useGameApplicationPage: pageMocks.useGameApplicationPage,
}))

function createPageController(data: unknown) {
  return {
    snapshotQuery: {
      isLoading: false,
      isError: false,
      data,
    },
    createTeam: { isPending: false, mutate: vi.fn() },
    joinTeam: { isPending: false, mutate: vi.fn() },
    leaveTeam: { isPending: false, mutate: vi.fn() },
    acceptInvitation: { isPending: false, variables: undefined, mutate: vi.fn() },
    declineInvitation: { isPending: false, variables: undefined, mutate: vi.fn() },
    toastMessage: null,
    dismissToast: vi.fn(),
  }
}

function renderPage() {
  return renderWithAppProviders(
    <MemoryRouter>
      <GameApplicationPage />
    </MemoryRouter>,
  )
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

beforeEach(() => {
  pageMocks.useGameApplicationPage.mockReturnValue(createPageController(null))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('GameApplicationPage', () => {
  it('shows a clean unavailable state while registration is closed', () => {
    renderPage()

    expect(screen.getByText('Заявка на игру')).toBeInTheDocument()
    expect(
      screen.getByText('Приём заявок закрыт. Дождитесь публикации игры администратором.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders invitation, create-team and open-team concerns as separate sections', () => {
    pageMocks.useGameApplicationPage.mockReturnValue(
      createPageController({
        gameId: 'game-1',
        gameStatus: 'ready',
        minPlayersPerTeam: 1,
        maxPlayersPerTeam: 4,
        slots: [],
        teams: [
          {
            teamId: 'team-1',
            slotIndex: 2,
            slotAvailability: 'public',
            reservedLabel: null,
            recruitmentOpen: true,
            status: 'forming',
            members: [],
          },
        ],
        myTeam: null,
        myPendingInvitations: [
          {
            invitationId: 'invitation-1',
            slotId: 'slot-1',
            slotIndex: 1,
            teamId: null,
            status: 'pending',
            createdAtUtc: '2026-06-11T12:00:00Z',
          },
        ],
      }),
    )

    renderPage()

    expect(screen.getByText('Приглашения')).toBeInTheDocument()
    expect(screen.getByText('Создать команду')).toBeInTheDocument()
    expect(screen.getByText('Открытые команды')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Принять' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Открытая комната' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Вступить' })).toBeInTheDocument()
  })
})
