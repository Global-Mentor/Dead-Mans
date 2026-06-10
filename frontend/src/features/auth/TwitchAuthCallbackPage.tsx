import { useMemo } from 'react'
import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { huntAuthCardSx, huntBrassTitleSx } from '../../shared/theme/surface-sx.ts'
import { AppButton, AuthScreenShell, CenteredProgress, SectionCard } from '../../shared/ui/index.ts'
import { useTwitchAuthCallback } from './use-twitch-auth-callback.ts'

function AuthCallbackErrorCard({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string
  message: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <SectionCard sx={(theme) => huntAuthCardSx(theme)}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Typography variant="h6" sx={huntBrassTitleSx}>
          {title}
        </Typography>
        <Typography color="text.secondary">{message}</Typography>
        <AppButton onClick={onAction}>{actionLabel}</AppButton>
      </Box>
    </SectionCard>
  )
}

export function TwitchAuthCallbackPage() {
  const { t } = useTranslation()
  const { callbackReason, isSuccess, navigateToLogin, sessionRestoreFailed } =
    useTwitchAuthCallback()
  const callbackReasonMessage = useMemo(() => {
    return t(`auth.callbackReasons.${callbackReason ?? 'unknown'}`, {
      defaultValue: t('auth.callbackReasons.unknown'),
    })
  }, [callbackReason, t])

  if (!isSuccess) {
    return (
      <AuthScreenShell>
        <AuthCallbackErrorCard
          title={t('auth.callbackFailedTitle')}
          message={callbackReasonMessage}
          actionLabel={t('auth.backToLogin')}
          onAction={navigateToLogin}
        />
      </AuthScreenShell>
    )
  }

  if (sessionRestoreFailed) {
    return (
      <AuthScreenShell>
        <AuthCallbackErrorCard
          title={t('auth.callbackFailedTitle')}
          message={t('auth.sessionRestoreFailed')}
          actionLabel={t('auth.backToLogin')}
          onAction={navigateToLogin}
        />
      </AuthScreenShell>
    )
  }

  return <CenteredProgress minHeight="100vh" message={t('auth.processing')} />
}
