import { cleanup, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { GameApplicationPage } from './GameApplicationPage.tsx'

vi.mock('./use-game-application-page.ts', () => ({
  useGameApplicationPage: () => ({
    snapshotQuery: {
      isLoading: false,
      isError: false,
      data: null,
    },
    createTeam: { isPending: false, mutate: vi.fn() },
    joinTeam: { isPending: false, mutate: vi.fn() },
    leaveTeam: { isPending: false, mutate: vi.fn() },
    acceptInvitation: { isPending: false, variables: undefined, mutate: vi.fn() },
    declineInvitation: { isPending: false, variables: undefined, mutate: vi.fn() },
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

describe('GameApplicationPage', () => {
  it('shows a clean unavailable state while registration is closed', () => {
    renderWithAppProviders(<GameApplicationPage />)

    expect(screen.getByText('Заявка на игру')).toBeInTheDocument()
    expect(
      screen.getByText('Приём заявок закрыт. Дождитесь публикации игры администратором.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
