import { panelRootPath } from '../../routes/app-routes.ts'

const storageKey = 'dm_login_return_to'

function safeReturnTo(value: string | null): string | null {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\r\n\t]/.test(value)) {
    return null
  }

  const url = new URL(value, window.location.origin)
  if (
    url.origin !== window.location.origin ||
    (url.pathname !== panelRootPath && !url.pathname.startsWith(`${panelRootPath}/`))
  ) {
    return null
  }

  return `${url.pathname}${url.search}${url.hash}`
}

export function getSignInPath(returnTo: string): string {
  const target = safeReturnTo(returnTo)
  return target ? `/?returnTo=${encodeURIComponent(target)}` : '/'
}

export function getSignInReturnTo(location: { search: string; hash: string }): string {
  const target = safeReturnTo(new URLSearchParams(location.search).get('returnTo'))
  if (!target) return panelRootPath

  // HTTP redirects inherit the original fragment, which the server cannot read.
  return target.includes('#') ? target : `${target}${location.hash}`
}

export function rememberLoginReturnTo(returnTo: string): void {
  try {
    window.sessionStorage.setItem(storageKey, safeReturnTo(returnTo) ?? panelRootPath)
  } catch {
    // Sign-in must still work when browser storage is unavailable.
  }
}

export function readLoginReturnTo(): string {
  try {
    return safeReturnTo(window.sessionStorage.getItem(storageKey)) ?? panelRootPath
  } catch {
    return panelRootPath
  }
}

export function clearLoginReturnTo(): void {
  try {
    window.sessionStorage.removeItem(storageKey)
  } catch {
    // Storage can be disabled while the external sign-in page is open.
  }
}
