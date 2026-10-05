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
    finalScore: null,
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
  const search = screen.getByRole('textbox', { name: 'Поиск по названию команды или участнику' })
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
  expect(within(early).getByLabelText('Место в очереди 3')).toBeInTheDocument()
  expect(within(late).getByLabelText('Место в очереди 2')).toBeInTheDocument()
  expect(within(panel).queryByText(/Отыгрыш #/)).not.toBeInTheDocument()
})

it('preserves slots while filtering and restores search focus on clear', () => {
  const base = teams[0]!
  renderWithAppProviders(
    <TeamQueuePanel
      {...props}
      teams={[
        {
          ...base,
          teamId: 'early',
          teamName: 'Ранние',
          teamSlotIndex: 3,
          isPlayed: true,
          playedAtUtc: '2026-08-09T10:00:00Z',
        },
        {
          ...base,
          teamId: 'late',
          teamName: 'Поздние',
          teamSlotIndex: 7,
          isPlayed: true,
          playedAtUtc: '2026-08-09T10:05:00Z',
        },
      ]}
    />,
  )
  const search = screen.getByRole('textbox', { name: 'Поиск по названию команды или участнику' })
  fireEvent.change(search, { target: { value: '  поздние  ' } })
  const late = screen.getByRole('article', { name: 'Поздние' })
  expect(within(late).getByLabelText('Место в очереди 7')).toBeVisible()
  expect(screen.getByRole('region', { name: 'Отыгравшие' })).toHaveTextContent('1 из 2')
  fireEvent.click(screen.getByRole('button', { name: 'Очистить поиск команд' }))
  expect(search).toHaveValue('')
  expect(search).toHaveFocus()
  expect(screen.getByRole('article', { name: 'Ранние' })).toBeVisible()
})

it('identifies active and personal teams and distinguishes signed, zero and missing scores', () => {
  const base = teams[0]!
  renderWithAppProviders(
    <TeamQueuePanel
      {...props}
      currentUserId="player-1"
      activeTeamId="active"
      teams={[
        { ...base, teamId: 'active', teamName: 'Активные' },
        { ...base, teamId: 'negative', teamName: 'Отрицательные', isPlayed: true, finalScore: -20 },
        { ...base, teamId: 'zero', teamName: 'Нулевые', isPlayed: true, finalScore: 0 },
        {
          ...base,
          teamId: 'missing',
          teamName: 'Без результата',
          isPlayed: true,
          finalScore: null,
        },
      ]}
    />,
  )
  const active = screen.getByRole('article', { name: 'Активные' })
  expect(within(active).getByText('Играет')).toBeVisible()
  expect(within(active).getByText('Ваша команда')).toBeVisible()
  expect(screen.getByLabelText('Итоговый результат: -20 очков')).toHaveTextContent('-20')
  expect(screen.getByLabelText('Итоговый результат: 0 очков')).toHaveTextContent('0')
  expect(screen.getByLabelText('Нет завершённого раунда')).toHaveTextContent('-')
})
