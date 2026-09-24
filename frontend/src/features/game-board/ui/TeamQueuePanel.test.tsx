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
  fireEvent.click(screen.getByRole('button', { name: 'Открыть очередь команд' }))
  const search = screen.getByRole('textbox', { name: 'Найти команду или игрока' })
  fireEvent.change(search, { target: { value: 'ворон' } })
  rerender(<TeamQueuePanel {...props} isError onRetry={onRetry} />)
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByRole('status')).toHaveTextContent(
    'Не удалось загрузить очередь команд.',
  )
  expect(within(dialog).getByRole('article', { name: 'Ночные странники' })).toBeVisible()
  expect(search).toHaveValue('ворон')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Повторить' }))
  expect(onRetry).toHaveBeenCalledTimes(1)
  rerender(<TeamQueuePanel {...props} isError isRefreshing onRetry={onRetry} />)
  expect(within(dialog).getByRole('button', { name: 'Повторить' })).toBeDisabled()
  expect(search).toHaveValue('ворон')
  rerender(<TeamQueuePanel {...props} onRetry={onRetry} />)
  expect(within(dialog).queryByText('Не удалось загрузить очередь команд.')).not.toBeInTheDocument()
  expect(search).toHaveValue('ворон')
})

it('offers a retry for an initial error without presenting it as an empty queue', () => {
  const onRetry = vi.fn()
  renderWithAppProviders(
    <TeamQueuePanel {...props} teams={[]} hasData={false} isError onRetry={onRetry} />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Открыть очередь команд' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить очередь команд.')
  expect(screen.queryByText('В очереди пока нет подтверждённых команд.')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
  expect(onRetry).toHaveBeenCalledTimes(1)
})
