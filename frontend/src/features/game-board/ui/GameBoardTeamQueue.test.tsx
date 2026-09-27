import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import i18n from '../../../i18n.ts'
import type { GameTeamQueueItem } from '../../../shared/api/contracts/index.ts'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { GameBoardTeamQueue } from './GameBoardTeamQueue.tsx'

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})
afterEach(cleanup)

const team: GameTeamQueueItem = {
  teamId: 'team-one',
  teamName: 'Ночные странники',
  teamSlotIndex: 1,
  isPlayed: true,
  playedAtUtc: '2026-09-01T10:00:00Z',
  finalScore: 0,
  participants: [],
}
const props = {
  collapsible: true,
  teams: [team],
  activeTeamId: null,
  isLoading: false,
  isError: false,
  hasData: true,
  isRefreshing: false,
  onRetry: vi.fn(),
}

it('keeps the disclosure choice across responsive layouts and failed refreshes', () => {
  const onRetry = vi.fn()
  const { rerender } = renderWithAppProviders(<GameBoardTeamQueue {...props} onRetry={onRetry} />)
  const queue = screen.getByTestId('game-board-team-queue')
  expect(queue.querySelector('details')).not.toHaveAttribute('open')
  fireEvent.click(within(queue).getByText('Очередь команд'))
  expect(queue.querySelector('details')).toHaveAttribute('open')

  rerender(<GameBoardTeamQueue {...props} onRetry={onRetry} collapsible={false} />)
  expect(screen.getByText('Ночные странники')).toBeVisible()
  rerender(<GameBoardTeamQueue {...props} onRetry={onRetry} isError />)
  const restoredQueue = screen.getByTestId('game-board-team-queue')
  expect(restoredQueue.querySelector('details')).toHaveAttribute('open')
  expect(screen.getByText('Ночные странники')).toBeVisible()
  expect(within(restoredQueue).getByRole('status')).toHaveTextContent(
    'Не удалось загрузить очередь команд.',
  )
  fireEvent.click(within(restoredQueue).getByRole('button', { name: 'Повторить' }))
  expect(onRetry).toHaveBeenCalledOnce()
  rerender(<GameBoardTeamQueue {...props} onRetry={onRetry} isError isRefreshing />)
  expect(screen.getByRole('button', { name: 'Повторить' })).toBeDisabled()
})

it('distinguishes a zero score from a missing completed round', () => {
  renderWithAppProviders(
    <GameBoardTeamQueue
      {...props}
      collapsible={false}
      teams={[team, { ...team, teamId: 'unscored', teamSlotIndex: 2, finalScore: null }]}
    />,
  )
  expect(screen.getByLabelText('Итоговый результат: 0 очков')).toHaveTextContent('0')
  expect(screen.getByLabelText('Нет завершённого раунда')).toHaveTextContent('-')
})

it('offers recovery for a failed initial request instead of an empty queue', () => {
  const onRetry = vi.fn()
  renderWithAppProviders(
    <GameBoardTeamQueue
      {...props}
      collapsible={false}
      teams={[]}
      hasData={false}
      isError
      onRetry={onRetry}
    />,
  )
  expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить очередь команд.')
  expect(screen.queryByText('В очереди пока нет подтверждённых команд.')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
  expect(onRetry).toHaveBeenCalledOnce()
})
