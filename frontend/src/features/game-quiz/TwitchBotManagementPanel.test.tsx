import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import type { TwitchBotStatus } from '../../shared/api/contracts/index.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { TwitchBotManagementPanel } from './TwitchBotManagementPanel.tsx'
import { gameQuizQueryKeys } from './api/game-quiz-queries.ts'

vi.mock('../../shared/auth/use-auth.ts', () => ({
  useAuth: () => ({ user: { roles: ['admin'] } }),
}))
const api = vi.hoisted(() => ({ fetchTwitchBotStatus: vi.fn() }))
vi.mock('./api/game-quiz-api.ts', async (original) => ({
  ...(await original<typeof import('./api/game-quiz-api.ts')>()),
  ...api,
}))
beforeAll(async () => {
  await i18n.changeLanguage('ru')
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it.each([
  'subscription_limit',
  'rate_limited',
  'authorization_required',
  'webhook_unreachable',
  'invalid_configuration',
  'unavailable',
] as const)('explains %s and clears the message after automatic recovery', async (code) => {
  const status: TwitchBotStatus = {
    enabled: true,
    botConnected: true,
    broadcasterConnected: true,
    eventSubConnected: false,
    accessRevoked: false,
    eventSubErrorCode: code,
    eventSubRetryAtUtc: '2026-11-02T15:30:00Z',
    lastError: 'PRIVATE BACKEND DIAGNOSTIC',
  }
  api.fetchTwitchBotStatus.mockResolvedValue(status)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  renderWithAppProviders(
    <QueryClientProvider client={client}>
      <TwitchBotManagementPanel />
    </QueryClientProvider>,
  )
  const copy = i18n.t(`gameQuiz.twitch.connectionErrors.${code}`)
  expect(await screen.findByText((text) => text.startsWith(copy))).toBeVisible()
  expect(screen.queryByText('PRIVATE BACKEND DIAGNOSTIC')).not.toBeInTheDocument()
  act(() =>
    client.setQueryData(gameQuizQueryKeys.twitchIntegration(), {
      ...status,
      eventSubConnected: true,
      eventSubErrorCode: null,
      eventSubRetryAtUtc: null,
    }),
  )
  await waitFor(() =>
    expect(screen.queryByText((text) => text.startsWith(copy))).not.toBeInTheDocument(),
  )
  client.clear()
})
