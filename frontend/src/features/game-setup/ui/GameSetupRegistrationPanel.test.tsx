import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../../i18n.ts'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { ApiError } from '../../../shared/api/errors/ApiError.ts'
import type { GameSetupSnapshot } from '../../../shared/api/contracts/index.ts'
import { currentGameBoardQueryOptions } from '../../game-board/index.ts'
import { GameSetupRegistrationPanel } from './GameSetupRegistrationPanel.tsx'

const mocks = vi.hoisted(() => ({ open: vi.fn(), navigate: vi.fn(), roles: ['admin'] }))
vi.mock('../api/game-setup-api.ts', async (original) => ({
  ...(await original<object>()),
  openDraftGameRegistration: mocks.open,
}))
vi.mock('react-router-dom', async (original) => ({
  ...(await original<object>()),
  useNavigate: () => mocks.navigate,
}))
vi.mock('../../../shared/auth/use-auth.ts', () => ({
  useAuth: () => ({ user: { roles: mocks.roles } }),
}))

const snapshot: GameSetupSnapshot = {
  gameId: 'draft-1',
  title: 'Test draft',
  status: 'draft',
  version: 7,
  rows: 1,
  cols: 1,
  rowLabels: ['100'],
  colLabels: ['A'],
  cells: [{ id: 'cell-1', row: 0, col: 0, title: 'Card', cost: 100, isOpened: false, media: null }],
  enabledModifierIds: [],
  enabledQuestionIds: [],
}
const defaultProps = {
  snapshot,
  isDirty: false,
  isSaving: false,
  isResetting: false,
  hasPendingMedia: false,
  remoteChangeNotice: false,
  onBusyChange: vi.fn(),
  onReloadFromServer: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
}
function renderPanel(overrides: Partial<typeof defaultProps> = {}, currentStatus?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  })
  client.setQueryData(
    currentGameBoardQueryOptions.queryKey,
    currentStatus ? { status: currentStatus } : null,
  )
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined)
  renderWithAppProviders(
    <QueryClientProvider client={client}>
      <GameSetupRegistrationPanel {...defaultProps} {...overrides} />
    </QueryClientProvider>,
  )
  return { invalidate, client }
}
beforeAll(async () => {
  await i18n.changeLanguage('ru')
})
beforeEach(() => {
  vi.clearAllMocks()
  mocks.roles = ['admin']
  mocks.open.mockResolvedValue({ gameId: 'draft-1', status: 'ready' })
})
afterEach(cleanup)

describe('GameSetupRegistrationPanel', () => {
  it('publishes the reviewed draft without quiz questions only after confirmation and refreshes shared state', async () => {
    const { invalidate } = renderPanel()
    expect(screen.getByText(/Вопросы викторины необязательны/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Открыть регистрацию', exact: true }))
    expect(mocks.open).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Опубликовать и открыть регистрацию' }))
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/panel/team-registrations'))
    expect(mocks.open.mock.calls[0]?.[0]).toEqual({ gameId: 'draft-1', expectedVersion: 7 })
    for (const queryKey of [
      ['gameSetup', 'draftSnapshot'],
      ['gameBoard', 'currentSnapshot'],
      ['gameRegistration', 'snapshot'],
      ['gameRegistration', 'adminSnapshot'],
    ]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey })
    }
  })
  it.each(['isDirty', 'isSaving', 'isResetting', 'hasPendingMedia', 'remoteChangeNotice'] as const)(
    'blocks publication while %s',
    (key) => {
      renderPanel({ [key]: true })
      expect(
        screen.getByRole('button', { name: 'Открыть регистрацию', exact: true }),
      ).toBeDisabled()
      expect(mocks.open).not.toHaveBeenCalled()
    },
  )
  it.each(['ready', 'active'])('blocks another current game in %s', (status) => {
    renderPanel({}, status)
    expect(screen.getByRole('button', { name: 'Открыть регистрацию', exact: true })).toBeDisabled()
    expect(screen.getByText(/Уже идёт регистрация или игра/)).toBeInTheDocument()
  })
  it('does not expose publication to moderators', () => {
    mocks.roles = ['moderator']
    renderPanel()
    expect(screen.queryByRole('button', { name: 'Открыть регистрацию' })).not.toBeInTheDocument()
  })
  it('shows a stale-version error and keeps the draft instead of navigating', async () => {
    mocks.open.mockRejectedValue(
      new ApiError('Conflict', { status: 409, details: { code: 'game_setup.stale_version' } }),
    )
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Открыть регистрацию', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Опубликовать и открыть регистрацию' }))
    expect(await screen.findByText(/Черновик изменился после проверки/)).toBeInTheDocument()
    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(defaultProps.onBusyChange).toHaveBeenLastCalledWith(false)
    fireEvent.click(await screen.findByRole('button', { name: 'Обновить', exact: true }))
    await waitFor(() => expect(defaultProps.onReloadFromServer).toHaveBeenCalledOnce())
  })
  it('prevents duplicate publication while a request is pending', async () => {
    let resolve!: (value: unknown) => void
    mocks.open.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r
        }),
    )
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Открыть регистрацию', exact: true }))
    const confirm = screen.getByRole('button', { name: 'Опубликовать и открыть регистрацию' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    await waitFor(() => expect(mocks.open).toHaveBeenCalledTimes(1))
    expect(confirm).toBeDisabled()
    resolve({ gameId: 'draft-1', status: 'ready' })
    await waitFor(() => expect(defaultProps.onBusyChange).toHaveBeenLastCalledWith(false))
  })

  it('blocks confirmation and explains when another game becomes ready while the dialog is open', async () => {
    const { client } = renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Открыть регистрацию', exact: true }))
    act(() => {
      client.setQueryData(currentGameBoardQueryOptions.queryKey, { status: 'ready' })
    })
    const dialog = within(screen.getByRole('dialog'))
    await waitFor(() =>
      expect(
        dialog.getByRole('button', { name: 'Опубликовать и открыть регистрацию' }),
      ).toBeDisabled(),
    )
    expect(dialog.getByText(/Уже идёт регистрация или игра/)).toBeInTheDocument()
    expect(mocks.open).not.toHaveBeenCalled()
  })

  it('shows reload failures without issuing another publication request', async () => {
    const reload = vi.fn().mockRejectedValue(new Error('Offline'))
    renderPanel({ remoteChangeNotice: true, onReloadFromServer: reload })
    fireEvent.click(screen.getByRole('button', { name: 'Обновить', exact: true }))
    expect(await screen.findByText('Не удалось загрузить настройку игры.')).toBeInTheDocument()
    expect(mocks.open).not.toHaveBeenCalled()
  })
})
