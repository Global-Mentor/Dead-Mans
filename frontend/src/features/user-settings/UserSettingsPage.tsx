import { useRef, useState, useEffect } from 'react'
import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  FormSwitch,
  InlineNotice,
  OrnamentDivider,
  PageShell,
  SectionCard,
} from '../../shared/ui/index.ts'
import { useAuth } from '../../shared/auth/use-auth.ts'
import {
  closeBrowserNotifications,
  prepareBrowserNotifications,
  setBrowserNotificationPreference,
  useBrowserNotificationPermission,
  useBrowserNotificationPreference,
  refreshBrowserNotificationPermission,
} from '../game-notifications/index.ts'

export function UserSettingsPage() {
  const { user } = useAuth()
  return user ? <NotificationSettings key={user.id} userId={user.id} /> : null
}

function NotificationSettings({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const enabled = useBrowserNotificationPreference(userId)
  const permission = useBrowserNotificationPermission()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<'failed' | 'dismissed' | 'storageFailed' | null>(null)
  const mounted = useRef(false)
  const busy = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const toggle = async () => {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError(null)
    try {
      if (enabled) {
        try {
          setBrowserNotificationPreference(userId, false)
        } catch {
          setError('storageFailed')
          return
        }
        await closeBrowserNotifications(userId).catch(() => {})
      } else {
        const result =
          Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
        if (!mounted.current) return
        if (result !== 'granted') {
          setError('dismissed')
          return
        }
        await prepareBrowserNotifications()
        if (!mounted.current) return
        try {
          setBrowserNotificationPreference(userId, true)
        } catch {
          setError('storageFailed')
        }
      }
    } catch {
      if (mounted.current) setError('failed')
    } finally {
      busy.current = false
      refreshBrowserNotificationPermission()
      if (mounted.current) setPending(false)
    }
  }

  return (
    <PageShell sx={{ maxWidth: 760 }}>
      <SectionCard component="section" aria-labelledby="user-settings-title">
        <Stack spacing={1.5}>
          <Typography id="user-settings-title" component="h1" variant="h6" textAlign="center">
            {t('userSettings.title')}
          </Typography>
          <OrnamentDivider />
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography
                id="browser-notification-label"
                component="label"
                htmlFor="browser-notification-switch"
                variant="body1"
              >
                {t('userSettings.browserNotifications')}
              </Typography>
              <Typography id="browser-notification-help" variant="body2" color="text.secondary">
                {t('userSettings.help')}
              </Typography>
            </Stack>
            <FormSwitch
              checked={enabled}
              disabled={pending || permission === 'unsupported' || permission === 'denied'}
              onChange={() => void toggle()}
              slotProps={{
                input: {
                  id: 'browser-notification-switch',
                  'aria-describedby': 'browser-notification-help',
                },
              }}
            />
          </Stack>
          {permission === 'denied' || permission === 'unsupported' ? (
            <InlineNotice severity="info">
              {t(permission === 'denied' ? 'userSettings.blocked' : 'userSettings.unsupported')}
            </InlineNotice>
          ) : error ? (
            <InlineNotice severity="error">{t(`userSettings.${error}`)}</InlineNotice>
          ) : null}
        </Stack>
      </SectionCard>
    </PageShell>
  )
}
