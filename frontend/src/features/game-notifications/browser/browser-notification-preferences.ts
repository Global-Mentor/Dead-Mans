import { useSyncExternalStore } from 'react'

const preferenceEvent = 'deadmans:browser-notifications-preference'
const preferenceKey = (userId: string) => `deadmans:browser-notifications:${userId}`

export function refreshBrowserNotificationPermission() {
  window.dispatchEvent(new Event(preferenceEvent))
}

export function supportsBrowserNotifications() {
  return (
    window.isSecureContext &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    typeof ServiceWorkerRegistration !== 'undefined' &&
    'showNotification' in ServiceWorkerRegistration.prototype &&
    'locks' in navigator
  )
}

// The value is an opt-in epoch, so enabling cannot replay an in-flight event.
export function getBrowserNotificationPreference(userId: string): string | null {
  try {
    return localStorage.getItem(preferenceKey(userId))
  } catch {
    return null
  }
}

export function setBrowserNotificationPreference(userId: string, enabled: boolean) {
  if (enabled) localStorage.setItem(preferenceKey(userId), crypto.randomUUID())
  else localStorage.removeItem(preferenceKey(userId))
  refreshBrowserNotificationPermission()
}

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener)
  window.addEventListener(preferenceEvent, listener)
  window.addEventListener('focus', listener)
  document.addEventListener('visibilitychange', listener)
  return () => {
    window.removeEventListener('storage', listener)
    window.removeEventListener(preferenceEvent, listener)
    window.removeEventListener('focus', listener)
    document.removeEventListener('visibilitychange', listener)
  }
}

export function useBrowserNotificationPreference(userId: string) {
  return useSyncExternalStore(
    subscribe,
    () =>
      supportsBrowserNotifications() &&
      Notification.permission === 'granted' &&
      getBrowserNotificationPreference(userId) !== null,
    () => false,
  )
}

export function useBrowserNotificationPermission() {
  return useSyncExternalStore(
    subscribe,
    () => (supportsBrowserNotifications() ? Notification.permission : 'unsupported'),
    () => 'unsupported',
  )
}
