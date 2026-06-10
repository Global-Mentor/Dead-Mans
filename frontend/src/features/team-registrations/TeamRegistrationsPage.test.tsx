import { cleanup, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { TeamRegistrationsPage } from './TeamRegistrationsPage.tsx'

vi.mock('./use-team-registrations-page.ts', () => ({
  useTeamRegistrationsPage: () => ({
    teamsQuery: {
      isLoading: false,
      isError: false,
      data: null,
    },
    confirmTeam: { isPending: false, variables: undefined, mutate: vi.fn() },
    rejectTeam: { isPending: false, variables: undefined, mutate: vi.fn() },
    toastMessage: null,
    dismissToast: vi.fn(),
  }),
}))

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

afterEach(() => {
  cleanup()
})

describe('TeamRegistrationsPage', () => {
  it('shows a clean unavailable state while registration is closed', () => {
    renderWithAppProviders(<TeamRegistrationsPage />)

    expect(screen.getByText('Заявки команд')).toBeInTheDocument()
    expect(
      screen.getByText('Приём заявок для игры в статусе ready пока не открыт.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
