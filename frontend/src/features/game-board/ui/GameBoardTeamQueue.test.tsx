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
  teams: [team],
  currentUserId: null,
  playedExpanded: false,
  onPlayedExpandedChange: vi.fn(),
  isLoading: false,
  isError: false,
  hasData: true,
  isRefreshing: false,
  onRetry: vi.fn(),
}

it('preserves populated content on refresh failure and prevents duplicate retries', () => {
  const onRetry = vi.fn()
  const { rerender } = renderWithAppProviders(<GameBoardTeamQueue {...props} onRetry={onRetry} />)
  rerender(<GameBoardTeamQueue {...props} onRetry={onRetry} isError />)
  expect(screen.getByText('Ночные странники')).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('Не удалось загрузить очередь команд.')
  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
  expect(onRetry).toHaveBeenCalledOnce()
  rerender(<GameBoardTeamQueue {...props} onRetry={onRetry} isError isRefreshing />)
  expect(screen.getByRole('button', { name: 'Повторить' })).toBeDisabled()
})

it('collapses longer played lists without hiding waiting teams', () => {
  const onPlayedExpandedChange = vi.fn()
  const teams = [
    { ...team, teamId: 'waiting', teamName: 'Ещё играем', isPlayed: false, playedAtUtc: null },
    ...Array.from({ length: 4 }, (_, index) => ({
      ...team,
      teamId: `played-${index}`,
      teamSlotIndex: index + 2,
    })),
  ]
  const { rerender } = renderWithAppProviders(
    <GameBoardTeamQueue {...props} teams={teams} onPlayedExpandedChange={onPlayedExpandedChange} />,
  )
  expect(screen.getByText('Ещё играем')).toBeVisible()
  const played = screen.getByRole('region', { name: 'Сыграли' })
  expect(played.querySelector('details')).not.toHaveAttribute('open')
  fireEvent.click(within(played).getByText('Сыграли'))
  expect(onPlayedExpandedChange).toHaveBeenCalledWith(true)
  rerender(<GameBoardTeamQueue {...props} teams={teams} playedExpanded />)
  expect(screen.getAllByText('Ночные странники')[0]).toBeVisible()
})

it('marks membership and labels team numbers without treating them as rankings', () => {
  renderWithAppProviders(
    <GameBoardTeamQueue
      {...props}
      currentUserId="me"
      teams={[
        { ...team, participants: [{ userId: 'me', displayName: 'Игрок', createdAtUtc: '' }] },
      ]}
    />,
  )
  expect(screen.getByText('Ваша команда')).toBeVisible()
  expect(screen.getByLabelText('Команда номер 1')).toHaveTextContent('1')
  expect(screen.getByRole('region', { name: 'В очереди · 0' })).toBeVisible()
})

it('distinguishes a zero score from a missing completed round', () => {
  renderWithAppProviders(
    <GameBoardTeamQueue
      {...props}
      teams={[team, { ...team, teamId: 'unscored', teamSlotIndex: 2, finalScore: null }]}
    />,
  )
  expect(screen.getByLabelText('Итоговый результат: 0 очков')).toHaveTextContent('0')
  expect(screen.getByLabelText('Нет завершённого раунда')).toHaveTextContent('-')
})

it('offers recovery for a failed initial request instead of an empty queue', () => {
  const onRetry = vi.fn()
  renderWithAppProviders(
    <GameBoardTeamQueue {...props} teams={[]} hasData={false} isError onRetry={onRetry} />,
  )
  expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить очередь команд.')
  expect(screen.queryByText('В очереди пока нет подтверждённых команд.')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
  expect(onRetry).toHaveBeenCalledOnce()
})
