import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import i18n from '../../../i18n.ts'
import type { GameTeamQueueItem } from '../../../shared/api/contracts/index.ts'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { TeamQueuePanel } from './TeamQueuePanel.tsx'

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})
afterEach(cleanup)
const teams: GameTeamQueueItem[] = [
  {
    teamId: 'team-1',
    teamName: 'Ночные странники',
    teamSlotIndex: 1,
    isPlayed: false,
    playedAtUtc: null,
    participants: [{ userId: 'player-1', displayName: 'Ворон' }],
  },
]
const props = {
  teams,
  isLoading: false,
  isError: false,
  hasData: true,
  isRefreshing: false,
  onRetry: vi.fn(),
}

it('retains the loaded teams and search when a refresh fails', () => {
  const onRetry = vi.fn()
  const { rerender } = renderWithAppProviders(<TeamQueuePanel {...props} onRetry={onRetry} />)
  const search = screen.getByRole('textbox', { name: 'Найти команду или игрока' })
  fireEvent.change(search, { target: { value: 'ворон' } })
  rerender(<TeamQueuePanel {...props} isError onRetry={onRetry} />)
  const panel = screen.getByTestId('team-queue-panel')
  expect(within(panel).getByRole('status')).toHaveTextContent(
    'Не удалось загрузить очередь команд.',
  )
  expect(within(panel).getByRole('article', { name: 'Ночные странники' })).toBeVisible()
  expect(search).toHaveValue('ворон')
  fireEvent.click(within(panel).getByRole('button', { name: 'Повторить' }))
  expect(onRetry).toHaveBeenCalledTimes(1)
  rerender(<TeamQueuePanel {...props} isError isRefreshing onRetry={onRetry} />)
  expect(within(panel).getByRole('button', { name: 'Повторить' })).toBeDisabled()
  expect(search).toHaveValue('ворон')
  rerender(<TeamQueuePanel {...props} onRetry={onRetry} />)
  expect(within(panel).queryByText('Не удалось загрузить очередь команд.')).not.toBeInTheDocument()
  expect(search).toHaveValue('ворон')
})

it('offers a retry for an initial error without presenting it as an empty queue', () => {
  const onRetry = vi.fn()
  renderWithAppProviders(
    <TeamQueuePanel {...props} teams={[]} hasData={false} isError onRetry={onRetry} />,
  )
  expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить очередь команд.')
  expect(screen.queryByText('В очереди пока нет подтверждённых команд.')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
  expect(onRetry).toHaveBeenCalledTimes(1)
})

it('keeps remaining teams ahead of teams sorted by play time', () => {
  renderWithAppProviders(
    <TeamQueuePanel
      {...props}
      teams={[
        { ...teams[0]!, teamId: 'waiting', teamName: 'Ожидают', teamSlotIndex: 1 },
        {
          ...teams[0]!,
          teamId: 'late',
          teamName: 'Поздние',
          teamSlotIndex: 2,
          isPlayed: true,
          playedAtUtc: '2026-08-09T10:05:00Z',
        },
        {
          ...teams[0]!,
          teamId: 'early',
          teamName: 'Ранние',
          teamSlotIndex: 3,
          isPlayed: true,
          playedAtUtc: '2026-08-09T10:00:00Z',
        },
      ]}
    />,
  )
  const panel = screen.getByTestId('team-queue-panel')
  const waiting = within(panel).getByRole('article', { name: 'Ожидают' })
  const early = within(panel).getByRole('article', { name: 'Ранние' })
  const late = within(panel).getByRole('article', { name: 'Поздние' })
  expect(waiting.compareDocumentPosition(early)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  expect(early.compareDocumentPosition(late)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  expect(within(early).getByText('Отыгрыш #1')).toBeInTheDocument()
  expect(within(late).getByText('Отыгрыш #2')).toBeInTheDocument()
})
