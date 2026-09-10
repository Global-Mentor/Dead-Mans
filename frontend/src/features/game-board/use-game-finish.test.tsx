import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { useGameFinish } from './use-game-finish.ts'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useGameFinish', () => {
  it('does not expose an empty success notification before a game is finished', () => {
    const { result } = renderHook(() => useGameFinish(), { wrapper: createWrapper() })

    expect(result.current.toastMessage).toBeNull()
  })
})
