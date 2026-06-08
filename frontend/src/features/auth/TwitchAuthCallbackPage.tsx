import { useMemo } from 'react'
import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AppButton, CenteredProgress, SectionCard } from '../../shared/ui/index.ts'
import { useTwitchAuthCallback } from './use-twitch-auth-callback.ts'

export function TwitchAuthCallbackPage() {
  const { t } = useTranslation()
  const { callbackReason, isSuccess, navigateToLogin, sessionRestoreFailed } = useTwitchAuthCallback()
  const callbackReasonMessage = useMemo(() => {
    return t(`auth.callbackReasons.${callbackReason ?? 'unknown'}`, {
      defaultValue: t('auth.callbackReasons.unknown'),
    })
  }, [callbackReason, t])

  if (!isSuccess) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SectionCard sx={{ p: 4, minWidth: 320 }}>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Typography variant="h6">{t('auth.callbackFailedTitle')}</Typography>
            <Typography color="text.secondary">{callbackReasonMessage}</Typography>
            <AppButton onClick={navigateToLogin}>
              {t('auth.backToLogin')}
            </AppButton>
          </Box>
        </SectionCard>
      </Box>
    )
  }

  if (sessionRestoreFailed) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SectionCard sx={{ p: 4, minWidth: 320 }}>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Typography variant="h6">{t('auth.callbackFailedTitle')}</Typography>
            <Typography color="text.secondary">{t('auth.sessionRestoreFailed')}</Typography>
            <AppButton onClick={navigateToLogin}>
              {t('auth.backToLogin')}
            </AppButton>
          </Box>
        </SectionCard>
      </Box>
    )
  }

  return (
    <CenteredProgress minHeight="100vh" message={t('auth.processing')} />
  )
}
