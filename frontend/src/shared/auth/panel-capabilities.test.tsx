import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { AuthContext } from './auth-context.ts'
import type { AuthContextValue, AuthUser } from './auth-context.ts'
import { hasPanelCapability } from './panel-capabilities.ts'
import { usePanelCapabilities } from './use-panel-capabilities.ts'

function createAuthContextValue(user: AuthUser | null): AuthContextValue {
  return {
    user,
    authStatus: user ? 'authenticated' : 'anonymous',
    isAuthenticated: user !== null,
    startTwitchLogin: () => undefined,
    logout: async () => undefined,
    refreshSession: async () => user !== null,
  }
}

function createWrapper(user: AuthUser | null) {
  const value = createAuthContextValue(user)

  return function AuthTestProvider({ children }: { children: ReactNode }) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  }
}

describe('panel capabilities', () => {
  it('keeps game setup restricted to admins', () => {
    expect(hasPanelCapability('gameSetup', ['admin'])).toBe(true)
    expect(hasPanelCapability('gameSetup', ['moderator'])).toBe(false)
    expect(hasPanelCapability('gameSetup', ['viewer'])).toBe(false)
  })

  it('allows admins and moderators to activate modifiers', () => {
    expect(hasPanelCapability('modifierActivation', ['admin'])).toBe(true)
    expect(hasPanelCapability('modifierActivation', ['moderator'])).toBe(true)
    expect(hasPanelCapability('modifierActivation', ['viewer'])).toBe(false)
  })

  it('derives capability flags from the authenticated user', () => {
    const wrapper = createWrapper({
      id: 'user-1',
      displayName: 'Moderator',
      roles: ['moderator'],
    })
    const { result } = renderHook(() => usePanelCapabilities(), { wrapper })

    expect(result.current).toEqual({
      canGameSetup: false,
      canModifierActivation: true,
    })
  })
})
