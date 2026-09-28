import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import i18n from '../../../i18n.ts'
import type { GameBoardSnapshot, GameTeamQueueItem } from '../../../shared/api/contracts/index.ts'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { GameBoardProgressPanel } from './GameBoardProgressPanel.tsx'

vi.mock('../../../shared/auth/use-auth.ts', () => ({
  useAuth: () => ({ user: { id: 'me' } }),
}))
beforeAll(async () => {
  await i18n.changeLanguage('ru')
})
afterEach(cleanup)

const snapshot: GameBoardSnapshot = {
  gameId: 'game-one',
  title: 'Игра',
  description: '',
  status: 'active',
  version: 1,
  rows: 1,
  cols: 1,
  rowLabels: ['100'],
  colLabels: ['Охота'],
  activeTeamId: 'active',
  cells: [
    {
      id: 'card',
      row: 0,
      col: 0,
      title: '',
      description: '',
      type: 'question',
      cost: 100,
      state: 'closed',
      media: [],
    },
  ],
  activeModifiers: [],
  enabledModifierIds: [],
}
const active: GameTeamQueueItem = {
  teamId: 'active',
  teamName: 'Ночные странники',
  teamSlotIndex: 1,
  isPlayed: false,
  playedAtUtc: null,
  finalScore: null,
  participants: [{ userId: 'me', displayName: 'Игрок', createdAtUtc: '' }],
}
const teams: GameTeamQueueItem[] = [
  active,
  { ...active, teamId: 'waiting', teamName: 'Охотники', teamSlotIndex: 2, participants: [] },
  ...Array.from({ length: 4 }, (_, index) => ({
    ...active,
    teamId: `played-${index}`,
    teamName: `Сыгравшие ${index}`,
    teamSlotIndex: index + 3,
    participants: [],
    isPlayed: true,
    playedAtUtc: '2026-09-01T10:00:00Z',
    finalScore: index * 10,
  })),
]
const queue = {
  teams,
  hasData: true,
  isLoading: false,
  isError: false,
  isRefreshing: false,
  onRetry: vi.fn(),
}

function panel(compact: boolean, isError = false, game: GameBoardSnapshot = snapshot) {
  return (
    <MemoryRouter>
      <GameBoardProgressPanel
        key={game.gameId}
        snapshot={game}
        compact={compact}
        activeRound={null}
        queue={{ ...queue, isError }}
      />
    </MemoryRouter>
  )
}

it('keeps phase and team visible while details are collapsed, then shows the roster and queue', () => {
  renderWithAppProviders(panel(false))
  const toggle = screen.getByTestId('game-board-phase-toggle')
  expect(screen.getByRole('heading', { name: 'Ход игры' })).toBeVisible()
  expect(within(toggle).getByText('Активная команда')).toBeVisible()
  expect(within(toggle).getByText('Ночные странники')).toBeVisible()
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByText('Игрок')).not.toBeVisible()
  expect(screen.queryByRole('region', { name: 'Очередь команд' })).not.toBeInTheDocument()
  fireEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const activeTeam = screen.getByRole('region', { name: 'Активная команда' })
  expect(within(activeTeam).getByText('Ночные странники')).toBeVisible()
  expect(within(activeTeam).getByRole('listitem')).toHaveTextContent('Игрок')
  expect(screen.getByText('Этап раунда')).toBeVisible()
  expect(screen.getByRole('region', { name: 'Очередь команд' })).toBeVisible()
  expect(within(activeTeam).getByText('Ваша команда')).toHaveStyle({
    clipPath: 'inset(50%)',
    width: '1px',
    height: '1px',
  })
  expect(screen.getByRole('region', { name: 'В очереди · 1' })).toBeVisible()
  expect(screen.getByTestId('game-board-phase')).toHaveTextContent('Выбор карточки')
  expect(
    within(screen.getByTestId('game-board-team-queue')).queryByText('Ночные странники'),
  ).not.toBeInTheDocument()
})

it('keeps the mobile dialog and played list through refresh failure and resizing', () => {
  const { rerender } = renderWithAppProviders(panel(true))
  fireEvent.click(screen.getByTestId('game-board-phase-toggle'))
  fireEvent.click(screen.getByRole('button', { name: 'Посмотреть очередь команд' }))
  const dialog = screen.getByRole('dialog', { name: 'Очередь команд' })
  expect(within(dialog).getByText('Сыгравшие 0')).toBeVisible()
  rerender(panel(true, true))
  expect(within(dialog).getByRole('status')).toHaveTextContent(
    'Не удалось загрузить очередь команд.',
  )
  expect(within(dialog).getByText('Сыгравшие 0')).toBeVisible()
  rerender(panel(false, true))
  expect(dialog).toBeVisible()
  expect(within(dialog).getByText('Сыгравшие 0')).toBeVisible()
})

it('does not repeat the game title when an active team has not been selected', () => {
  renderWithAppProviders(panel(false, false, { ...snapshot, activeTeamId: null }))
  fireEvent.click(screen.getByTestId('game-board-phase-toggle'))
  expect(screen.getByTestId('game-board-phase')).toHaveTextContent('Выбор активной команды')
  expect(screen.queryByTestId('game-board-status-title')).not.toBeInTheDocument()
  expect(screen.queryByText('Игра')).not.toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Очередь команд' })).toBeVisible()
})

it('closes the old dialog for a new game identity', () => {
  const { rerender } = renderWithAppProviders(panel(true))
  fireEvent.click(screen.getByTestId('game-board-phase-toggle'))
  fireEvent.click(screen.getByRole('button', { name: 'Посмотреть очередь команд' }))
  expect(screen.getByRole('dialog')).toBeVisible()
  rerender(panel(true, false, { ...snapshot, gameId: 'game-two' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByTestId('game-board-phase-toggle')).toHaveAttribute('aria-expanded', 'false')
})

it.each(['ready', 'finished'] as const)(
  'keeps %s actions available without excluding a stale active team',
  (status) => {
    renderWithAppProviders(panel(false, false, { ...snapshot, status }))
    expect(
      screen.getByRole('link', {
        name: status === 'ready' ? 'Подать заявку' : 'Открыть результаты',
      }),
    ).toBeVisible()
    fireEvent.click(screen.getByTestId('game-board-phase-toggle'))
    expect(screen.getByRole('region', { name: 'В очереди · 2' })).toBeVisible()
  },
)
