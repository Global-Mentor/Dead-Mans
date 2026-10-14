import { useEffect, useState } from 'react'
import { HubConnectionBuilder, HttpTransportType, LogLevel } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { getBackendOrigin } from '../../shared/api/config.ts'
import { realtimeHubs } from '../../shared/realtime/index.ts'
import { calculateSignalrRetryDelay } from '../../shared/realtime/signalr-connection-manager.ts'

export function useOverlayRealtime(key: string, enabled: boolean) {
  const client = useQueryClient()
  const [connectedKey, setConnectedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let disposed = false
    let retryCount = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let refreshTimer: ReturnType<typeof setTimeout> | undefined
    let refreshing = false
    let dirty = false
    const queryKey = ['game-overlay', key]
    const refresh = () => {
      dirty = true
      if (refreshTimer || refreshing || disposed) return
      // Coalesce bursts and serialize refreshes, including events arriving during a request.
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined
        dirty = false
        refreshing = true
        void (async () => {
          // A poll already in flight may represent the state before this event.
          await client.cancelQueries({ queryKey, exact: true })
          if (!disposed) await client.invalidateQueries({ queryKey, exact: true })
        })().finally(() => {
          refreshing = false
          if (dirty) refresh()
        })
      }, 150)
    }
    const connection = new HubConnectionBuilder()
      .withUrl(`${getBackendOrigin()}${realtimeHubs.gameOverlay.path}`, {
        transport: HttpTransportType.LongPolling,
        headers: { 'X-Overlay-Key': key },
        withCredentials: false,
        timeout: 8000,
      })
      .configureLogging(LogLevel.None)
      .build()
    const start = async () => {
      try {
        await connection.start()
        if (disposed) return
        retryCount = 0
        setConnectedKey(key)
        refresh()
      } catch {
        scheduleRetry()
      }
    }
    const scheduleRetry = () => {
      if (disposed || retryTimer) return
      setConnectedKey(null)
      retryTimer = setTimeout(() => {
        retryTimer = undefined
        void start()
      }, calculateSignalrRetryDelay(retryCount++))
    }
    connection.on(realtimeHubs.gameOverlay.events.frameChanged, refresh)
    connection.onclose(scheduleRetry)
    void start()
    return () => {
      disposed = true
      clearTimeout(retryTimer)
      clearTimeout(refreshTimer)
      void connection.stop()
    }
  }, [client, key, enabled])

  return enabled && connectedKey === key
}
