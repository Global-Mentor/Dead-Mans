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

it('shows longer played lists without another disclosure', () => {
  const teams = [
    { ...team, teamId: 'waiting', teamName: 'Ещё играем', isPlayed: false, playedAtUtc: null },
    ...Array.from({ length: 4 }, (_, index) => ({
      ...team,
      teamId: `played-${index}`,
      teamSlotIndex: index + 2,
    })),
  ]
  renderWithAppProviders(<GameBoardTeamQueue {...props} teams={teams} />)
  expect(screen.getByText('Ещё играем')).toBeVisible()
  const played = screen.getByRole('region', { name: 'Сыграли' })
  expect(played.querySelector('details')).not.toBeInTheDocument()
  expect(screen.getAllByText('Ночные странники')[0]).toBeVisible()
})

it('marks membership and labels played positions', () => {
  renderWithAppProviders(
    <GameBoardTeamQueue
      {...props}
      currentUserId="me"
      teams={[
        { ...team, participants: [{ userId: 'me', displayName: 'Игрок', createdAtUtc: '' }] },
      ]}
    />,
  )
  expect(screen.getByText('Ваша команда')).toHaveStyle({
    clipPath: 'inset(50%)',
    width: '1px',
    height: '1px',
  })
  expect(screen.getByLabelText('Место 1')).toHaveTextContent('1')
  expect(screen.getByRole('region', { name: 'В очереди · 0' })).toBeVisible()
})

it('ranks played teams by result and shows a diamond instead of a waiting slot number', () => {
  renderWithAppProviders(
    <GameBoardTeamQueue
      {...props}
      teams={[
        { ...team, teamId: 'waiting', teamName: 'Ждут', teamSlotIndex: 9, isPlayed: false },
        { ...team, teamId: 'low', teamName: 'Низкий', finalScore: -20 },
        { ...team, teamId: 'tie-first', teamName: 'Равный первый', finalScore: 50 },
        {
          ...team,
          teamId: 'tie-second',
          teamName: 'Равный второй',
          finalScore: 50,
          playedAtUtc: '2026-09-01T11:00:00Z',
        },
        { ...team, teamId: 'best', teamName: 'Лучший', finalScore: 300 },
        { ...team, teamId: 'unscored', teamName: 'Без результата', finalScore: null },
      ]}
    />,
  )

  const waiting = screen.getByRole('region', { name: 'В очереди · 1' })
  expect(within(waiting).getByText('Ждут')).toBeVisible()
  expect(within(waiting).queryByText('9')).not.toBeInTheDocument()

  const rows = within(screen.getByRole('region', { name: 'Сыграли' })).getAllByRole('listitem')
  const expectedNames = ['Лучший', 'Равный первый', 'Равный второй', 'Низкий', 'Без результата']
  expect(rows).toHaveLength(expectedNames.length)
  for (const [index, row] of rows.entries()) {
    expect(within(row).getByText(expectedNames[index] ?? '')).toBeVisible()
    expect(within(row).getByLabelText(`Место ${index + 1}`)).toBeVisible()
  }
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
