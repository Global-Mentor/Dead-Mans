import { cleanup, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { TeamRegistrationsPage } from './TeamRegistrationsPage.tsx'

const pageMocks = vi.hoisted(() => ({
  useTeamRegistrationsPage: vi.fn(),
}))

vi.mock('./use-team-registrations-page.ts', () => ({
  useTeamRegistrationsPage: pageMocks.useTeamRegistrationsPage,
}))

function createPageController(data: unknown, overrides: Record<string, unknown> = {}) {
  return {
    teamsQuery: {
      isLoading: false,
      isError: false,
      data,
    },
    confirmTeam: { isPending: false, variables: undefined, mutate: vi.fn() },
    rejectTeam: { isPending: false, variables: undefined, mutate: vi.fn() },
    toastMessage: null,
    dismissToast: vi.fn(),
    ...overrides,
  }
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

beforeEach(() => {
  pageMocks.useTeamRegistrationsPage.mockReturnValue(createPageController(null))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('TeamRegistrationsPage', () => {
  it('renders loading and error states', () => {
    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController(null, {
        teamsQuery: { isLoading: true, isError: false, data: undefined },
      }),
    )
    renderWithAppProviders(<TeamRegistrationsPage />)
    expect(screen.getByText('Загрузка команд...')).toBeInTheDocument()

    cleanup()
    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController(null, {
        teamsQuery: { isLoading: false, isError: true, data: undefined },
      }),
    )
    renderWithAppProviders(<TeamRegistrationsPage />)
    expect(screen.getByText('Не удалось загрузить команды.')).toBeInTheDocument()
  })

  it('shows a clean unavailable state while registration is closed', () => {
    renderWithAppProviders(<TeamRegistrationsPage />)

    expect(screen.getByText('Заявки команд')).toBeInTheDocument()
    expect(
      screen.getByText('Приём заявок для игры в статусе ready пока не открыт.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders both an empty ready state and actionable team rows', () => {
    pageMocks.useTeamRegistrationsPage.mockReturnValue(createPageController([]))
    renderWithAppProviders(<TeamRegistrationsPage />)
    expect(screen.getByText('Пока нет зарегистрированных команд.')).toBeInTheDocument()

    cleanup()
    pageMocks.useTeamRegistrationsPage.mockReturnValue(
      createPageController([
        {
          teamId: 'team-1',
          slotIndex: 2,
          slotAvailability: 'public',
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
        },
      ]),
    )
    renderWithAppProviders(<TeamRegistrationsPage />)

    expect(screen.getByText('Player One')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Подтвердить' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Отклонить' })).toBeEnabled()
  })
})
