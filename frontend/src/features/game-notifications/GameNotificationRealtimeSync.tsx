import { useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSignalrHubSubscription, realtimeHubs } from '../../shared/realtime/index.ts'
import { refreshRealtimeQueries } from '../../shared/realtime/refresh-realtime-queries.ts'
import { gameRegistrationQueryKeys } from '../game-registration/index.ts'
import { gameNotificationQueryKeys } from './api/game-notification-queries.ts'
import {
  browserNotificationSnapshot,
  newBrowserNotifications,
} from './model/browser-notification-snapshot.ts'
import { getBrowserNotificationPreference } from './browser/browser-notification-preferences.ts'
import {
  closeBrowserNotifications,
  deliverBrowserNotifications,
} from './browser/browser-notification-delivery.ts'

export function GameNotificationRealtimeSync({
  userId,
  canSeeStaffNotifications,
}: {
  userId: string
  canSeeStaffNotifications: boolean
}) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const lifetime = useRef({ generation: 0, ready: false, mountedUserId: null as string | null })
  useEffect(() => {
    const state = lifetime.current
    state.mountedUserId = userId
    return () => {
      state.mountedUserId = null
      state.generation++
      state.ready = false
      queueMicrotask(() => {
        if (state.mountedUserId !== userId) void closeBrowserNotifications(userId).catch(() => {})
      })
    }
  }, [userId])

  const refresh = useCallback(async () => {
    await Promise.all([
      refreshRealtimeQueries(queryClient, gameNotificationQueryKeys.all),
      refreshRealtimeQueries(queryClient, gameRegistrationQueryKeys.all),
    ])
  }, [queryClient])

  const onConnected = useCallback(async () => {
    const state = lifetime.current
    const current = ++state.generation
    state.ready = false
    await refresh()
    if (current === state.generation) state.ready = true
  }, [refresh])

  const registerEventHandlers = useCallback(
    (connection: {
      state?: string
      on: (event: string, handler: () => void) => void
      off: (event: string, handler: () => void) => void
    }) => {
      let subscribed = true
      const onEvent = async () => {
        const state = lifetime.current
        const current = state.generation
        const wasReady = state.ready
        const epoch = getBrowserNotificationPreference(userId)
        const before = browserNotificationSnapshot(queryClient, t, canSeeStaffNotifications)
        await refresh()
        const isCurrent = () =>
          subscribed &&
          state.ready &&
          current === state.generation &&
          connection.state === 'Connected'
        if (!wasReady || !isCurrent()) return
        const after = browserNotificationSnapshot(queryClient, t, canSeeStaffNotifications)
        await deliverBrowserNotifications(
          userId,
          epoch,
          newBrowserNotifications(before, after),
          isCurrent,
        )
      }
      const handler = () => {
        void onEvent().catch(() => {})
      }
      const events = [
        realtimeHubs.gameBoard.events.userNotificationCreated,
        realtimeHubs.gameBoard.events.registrationChanged,
      ]
      for (const event of events) connection.on(event, handler)
      return () => {
        subscribed = false
        for (const event of events) connection.off(event, handler)
      }
    },
    [queryClient, refresh, userId, t, canSeeStaffNotifications],
  )

  useSignalrHubSubscription({
    hub: 'gameBoard',
    logLabel: 'Game notifications',
    onConnected,
    registerEventHandlers,
  })
  return null
}
