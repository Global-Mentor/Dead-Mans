import { cleanup, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { GameBoardPage } from './GameBoardPage.tsx'

vi.mock('./use-game-board-page.ts', () => ({
  useGameBoardPage: () => ({
    isLoading: false,
    isError: false,
    data: {
      gameId: 'game-1',
      title: 'Тестовая игра',
      description: 'Описание игры',
      status: 'active',
      version: 1,
      rows: 1,
      cols: 1,
      rowLabels: ['A'],
      colLabels: ['1'],
      cells: [],
      enabledModifierCodes: [],
      activeModifiers: [],
    },
  }),
}))

vi.mock('./use-open-game-board-cell.ts', () => ({
  useOpenGameBoardCell: () => ({
    pendingCell: null,
    toastMessage: null,
    canOpenCells: false,
    isSubmitting: false,
    requestOpenCell: vi.fn(),
    confirmOpenCell: vi.fn(),
    dismissPendingCell: vi.fn(),
    dismissToast: vi.fn(),
  }),
}))

vi.mock('./ui/GameBoardGrid.tsx', () => ({
  GameBoardGrid: () => <div data-testid="game-board-grid" />,
}))

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

afterEach(() => {
  cleanup()
})

describe('GameBoardPage', () => {
  it('renders only the game board surface and its status', () => {
    renderWithAppProviders(<GameBoardPage />)

    expect(screen.getByRole('heading', { name: 'Тестовая игра' })).toBeInTheDocument()
    expect(screen.getByText('Активна')).toBeInTheDocument()
    expect(screen.getByTestId('game-board-grid')).toBeInTheDocument()
    expect(screen.queryByText(/модификатор/i)).not.toBeInTheDocument()
  })
})
