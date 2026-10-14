import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useOverlayTest } from './use-overlay-test.ts'

const mocks = vi.hoisted(() => ({
  userId: 'first-owner',
  fetch: vi.fn(),
  set: vi.fn(),
}))
vi.mock('../../shared/auth/use-auth.ts', () => ({
  useAuth: () => ({ user: { id: mocks.userId } }),
}))
vi.mock('./api/overlay-api.ts', () => ({
  fetchOverlayTestState: mocks.fetch,
  setOverlayTestEnabled: mocks.set,
}))

beforeEach(() => {
  vi.resetAllMocks()
  mocks.userId = 'first-owner'
})
afterEach(cleanup)

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderHook(useOverlayTest, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
}

it('never shows the previous owner test state while the new owner is loading', async () => {
  mocks.fetch.mockResolvedValueOnce({ hasKey: true, enabled: true })
  const { result, rerender } = setup()
  await waitFor(() => expect(result.current.state.data?.enabled).toBe(true))
  let resolveState: (value: { hasKey: boolean; enabled: boolean }) => void = () => {}
  mocks.fetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveState = resolve
      }),
  )
  mocks.userId = 'second-owner'
  rerender()
  expect(result.current.state.data).toBeUndefined()
  await act(async () => resolveState({ hasKey: false, enabled: false }))
  await waitFor(() => expect(result.current.state.data?.hasKey).toBe(false))
})

it('retains a confirmed change when refresh fails and resets mode after key revocation', async () => {
  mocks.fetch.mockResolvedValueOnce({ hasKey: true, enabled: false })
  const { result } = setup()
  await waitFor(() => expect(result.current.state.isSuccess).toBe(true))
  mocks.set.mockResolvedValueOnce({ hasKey: true, enabled: true })
  mocks.fetch.mockRejectedValue(new Error('Offline'))
  await act(async () => result.current.change.mutateAsync(true))
  expect(mocks.set).toHaveBeenCalledWith(true, expect.anything())
  await waitFor(() => expect(result.current.state.isError).toBe(true))
  expect(result.current.state.data).toEqual({ hasKey: true, enabled: true })
  await act(async () => result.current.reset(false))
  await waitFor(() => expect(result.current.state.data).toEqual({ hasKey: false, enabled: false }))
})
