import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearLoginReturnTo,
  getSignInPath,
  getSignInReturnTo,
  readLoginReturnTo,
  rememberLoginReturnTo,
} from './login-return-to.ts'

beforeEach(() => window.sessionStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('login return destination', () => {
  it('preserves a panel path, escaped query and section through sign-in', () => {
    const target = '/panel/game-guide?query=%D0%BD%D0%B0%D0%B1%D0%BE%D1%80%26rules#score'
    const signIn = new URL(getSignInPath(target), window.location.origin)
    expect(getSignInReturnTo(signIn)).toBe(target)
    rememberLoginReturnTo(getSignInReturnTo(signIn))
    expect(readLoginReturnTo()).toBe(target)
    clearLoginReturnTo()
    expect(readLoginReturnTo()).toBe('/panel')
  })

  it('keeps the fragment inherited from a server redirect without replacing an explicit one', () => {
    expect(getSignInReturnTo({ search: '?returnTo=%2Fpanel%2Fgame-guide', hash: '#score' })).toBe(
      '/panel/game-guide#score',
    )
    expect(
      getSignInReturnTo({ search: '?returnTo=%2Fpanel%2Fgame-guide%23quiz', hash: '#score' }),
    ).toBe('/panel/game-guide#quiz')
  })

  it.each([
    '',
    'https://attacker.test/panel/game-guide',
    '//attacker.test/panel/game-guide',
    '/\\attacker.test/panel/game-guide',
    'javascript:alert(1)',
    '/auth/callback?status=authenticated',
    '/',
    '/panel-other',
    '/panel/../auth/twitch/login',
    '/panel/%2e%2e/auth/twitch/login',
    '/panel\n/game-guide',
    '/panel\t/game-guide',
  ])('rejects unsafe or non-panel destination %j', (target) => {
    expect(getSignInPath(target)).toBe('/')
    expect(
      getSignInReturnTo({ search: `?returnTo=${encodeURIComponent(target)}`, hash: '#score' }),
    ).toBe('/panel')
    rememberLoginReturnTo(target)
    expect(readLoginReturnTo()).toBe('/panel')
    window.sessionStorage.setItem('dm_login_return_to', target)
    expect(readLoginReturnTo()).toBe('/panel')
  })

  it('replaces an abandoned destination when a new login starts', () => {
    rememberLoginReturnTo('/panel/game-guide#quiz')
    rememberLoginReturnTo('/panel')
    expect(readLoginReturnTo()).toBe('/panel')
  })

  it('allows sign-in with a safe default when storage is blocked', () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError')
    })
    expect(() => rememberLoginReturnTo('/panel/game-guide')).not.toThrow()
    expect(readLoginReturnTo()).toBe('/panel')
    expect(() => clearLoginReturnTo()).not.toThrow()
  })
})
