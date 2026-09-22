import { Alert, Box, Chip, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { TwitchBotStatus } from '../../shared/api/contracts/index.ts'
import { AppButton, SectionCard } from '../../shared/ui/index.ts'

type Props = {
  status: TwitchBotStatus
  canAdmin: boolean
  busy: boolean
  onRetry: () => void
  onCancel: () => void
  onSkipOutcome: () => void
}

export function TwitchBotPanel({
  status,
  canAdmin,
  busy,
  onRetry,
  onCancel,
  onSkipOutcome,
}: Props) {
  const { t } = useTranslation()
  if (!status.enabled) return null
  const publication = status.publication
  const needsRecovery = publication?.status === 'failed' || publication?.status === 'uncertain'
  const unresolvedOutcome =
    publication?.outcomeDeliveryStatus === 'failed' ||
    publication?.outcomeDeliveryStatus === 'uncertain'
  const showDeliveryDetails = publication != null && publication.status !== 'completed'

  return (
    <SectionCard component="section" sx={{ p: { xs: 1.5, sm: 1.75 } }}>
      <Stack spacing={1}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Box sx={{ minWidth: { sm: 112 } }}>
            <Typography variant="overline" color="text.secondary">
              {t('gameQuiz.twitch.title')}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
            <Chip
              size="small"
              color={status.botConnected ? 'success' : 'warning'}
              label={t(
                status.botConnected
                  ? 'gameQuiz.twitch.botConnected'
                  : 'gameQuiz.twitch.botDisconnected',
              )}
            />
            <Chip
              size="small"
              color={status.broadcasterConnected ? 'success' : 'warning'}
              label={t(
                status.broadcasterConnected
                  ? 'gameQuiz.twitch.channelConnected'
                  : 'gameQuiz.twitch.channelDisconnected',
              )}
            />
            <Chip
              size="small"
              color={status.eventSubConnected ? 'success' : 'warning'}
              label={t(
                status.eventSubConnected
                  ? 'gameQuiz.twitch.eventSubConnected'
                  : 'gameQuiz.twitch.eventSubDisconnected',
              )}
            />
            {publication ? (
              <Chip size="small" label={t(`gameQuiz.twitch.status.${publication.status}`)} />
            ) : null}
          </Stack>
        </Stack>
        {showDeliveryDetails ? (
          <Typography variant="caption" color="text.secondary">
            {t('gameQuiz.twitch.delivery', {
              question: t(`gameQuiz.twitch.deliveryStatus.${publication.questionDeliveryStatus}`),
              options: t(`gameQuiz.twitch.deliveryStatus.${publication.optionsDeliveryStatus}`),
              outcome: t(`gameQuiz.twitch.deliveryStatus.${publication.outcomeDeliveryStatus}`),
            })}
          </Typography>
        ) : null}
        {canAdmin && (!status.botConnected || !status.broadcasterConnected) ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {!status.botConnected ? (
              <AppButton
                size="small"
                onClick={() => window.location.assign('/api/integrations/twitch/oauth/bot')}
              >
                {t('gameQuiz.twitch.connectBot')}
              </AppButton>
            ) : null}
            {!status.broadcasterConnected ? (
              <AppButton
                size="small"
                tone="secondary"
                onClick={() => window.location.assign('/api/integrations/twitch/oauth/broadcaster')}
              >
                {t('gameQuiz.twitch.connectChannel')}
              </AppButton>
            ) : null}
          </Stack>
        ) : null}
        {publication?.status === 'publishing' ? (
          <Alert severity="info">{t('gameQuiz.twitch.publishing')}</Alert>
        ) : null}
        {publication?.status === 'uncertain' ? (
          <Alert severity="warning">{t('gameQuiz.twitch.uncertainWarning')}</Alert>
        ) : null}
        {publication?.lastError || status.lastError ? (
          <Alert severity={publication?.status === 'uncertain' ? 'warning' : 'error'}>
            {publication?.lastError ?? status.lastError}
          </Alert>
        ) : null}
        {needsRecovery || unresolvedOutcome ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {needsRecovery ? (
              <AppButton size="small" disabled={busy} onClick={onRetry}>
                {t('gameQuiz.twitch.retry')}
              </AppButton>
            ) : null}
            {!unresolvedOutcome && publication?.status !== 'completed' ? (
              <AppButton size="small" tone="secondary" disabled={busy} onClick={onCancel}>
                {t('gameQuiz.twitch.cancel')}
              </AppButton>
            ) : null}
            {unresolvedOutcome ? (
              <AppButton size="small" tone="ghost" disabled={busy} onClick={onSkipOutcome}>
                {t('gameQuiz.twitch.skipOutcome')}
              </AppButton>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </SectionCard>
  )
}
