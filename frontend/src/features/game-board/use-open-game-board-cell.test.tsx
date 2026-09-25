import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import type { GameBoardCell } from '../../shared/api/contracts/index.ts'
import { AuthContext } from '../../shared/auth/auth-context.ts'
import { useOpenGameBoardCell } from './use-open-game-board-cell.ts'

const apiMocks = vi.hoisted(() => ({
  openGameBoardCell: vi.fn(),
}))

vi.mock('./api/game-board-data-access.ts', async () => {
  const actual = await vi.importActual<typeof import('./api/game-board-data-access.ts')>(
    './api/game-board-data-access.ts',
  )

  return {
    ...actual,
    openGameBoardCell: apiMocks.openGameBoardCell,
  }
})

const cell: GameBoardCell = {
  id: 'cell-1',
  row: 0,
  col: 0,
  title: 'Newly opened card',
  description: 'Full card description',
  cost: 200,
  state: 'closed',
  media: [],
}

const authContextValue = {
  user: {
    id: 'admin-1',
    displayName: 'Admin',
    roles: ['admin'] as const,
  },
  authStatus: 'authenticated' as const,
  isAuthenticated: true,
  startTwitchLogin: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function createWrapper(queryClient = createQueryClient()) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>
        </I18nextProvider>
      </QueryClientProvider>
    )
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  apiMocks.openGameBoardCell.mockResolvedValue(undefined)
})

describe('useOpenGameBoardCell', () => {
  it('runs the local success action after the server opens a card', async () => {
    const onOpenSuccess = vi.fn()
    const { result } = renderHook(
      () =>
        useOpenGameBoardCell({
          activeTeamId: 'team-1',
          gameStatus: 'active',
          onOpenSuccess,
        }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.requestOpenCell(cell))
    expect(result.current.pendingCell).toEqual(cell)
    act(() => result.current.confirmOpenCell())

    await waitFor(() => expect(apiMocks.openGameBoardCell).toHaveBeenCalledWith('cell-1'))
    await waitFor(() => expect(onOpenSuccess).toHaveBeenCalledOnce())
  })

  it('keeps the opener on the board when opening fails', async () => {
    apiMocks.openGameBoardCell.mockRejectedValue(new Error('Open failed'))
    const onOpenSuccess = vi.fn()
    const { result } = renderHook(
      () =>
        useOpenGameBoardCell({
          activeTeamId: 'team-1',
          gameStatus: 'active',
          onOpenSuccess,
        }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.requestOpenCell(cell))
    act(() => result.current.confirmOpenCell())

    await waitFor(() => expect(result.current.toastMessage).toBeTruthy())
    expect(onOpenSuccess).not.toHaveBeenCalled()
  })
})
