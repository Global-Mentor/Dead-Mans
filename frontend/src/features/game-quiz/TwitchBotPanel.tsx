import { Box, Stack, Typography } from '@mui/material'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import type { TwitchBotStatus } from '../../shared/api/contracts/index.ts'
import { RoundBriefingPanel, RoundBriefingDivider } from '../../shared/game-ui/index.ts'
import { AppButton, InlineNotice, SectionDivider, StatusReadout } from '../../shared/ui/index.ts'
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
  const hasDetails =
    (canAdmin && (!status.botConnected || !status.broadcasterConnected)) ||
    needsRecovery ||
    unresolvedOutcome ||
    Boolean(publication?.lastError || status.lastError)

  return (
    <RoundBriefingPanel
      component="section"
      aria-label={t('gameQuiz.twitch.title')}
      sx={{ px: 1, py: 0 }}
    >
      <Box sx={{ display: 'grid', gridTemplateRows: 'minmax(0, 1fr) auto minmax(0, 1fr)' }}>
        <Typography
          component="h2"
          variant="h6"
          color="primary.light"
          fontWeight={700}
          textAlign="center"
          sx={{
            py: 1,
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {t('gameQuiz.twitch.title')}
        </Typography>
        <RoundBriefingDivider />
        <Stack direction="row" spacing={1} alignItems="stretch" sx={{ py: 1, minHeight: 48 }}>
          {[
            {
              label: t('gameQuiz.twitch.botLabel'),
              connected: status.botConnected,
              value: t(
                status.botConnected
                  ? 'gameQuiz.twitch.botConnected'
                  : 'gameQuiz.twitch.botDisconnected',
              ),
            },
            {
              label: t('gameQuiz.twitch.channelLabel'),
              connected: status.broadcasterConnected,
              value: t(
                status.broadcasterConnected
                  ? 'gameQuiz.twitch.channelConnected'
                  : 'gameQuiz.twitch.channelDisconnected',
              ),
            },
            {
              label: t('gameQuiz.twitch.eventSubLabel'),
              connected: status.eventSubConnected,
              value: t(
                status.eventSubConnected
                  ? 'gameQuiz.twitch.eventSubConnected'
                  : 'gameQuiz.twitch.eventSubDisconnected',
              ),
            },
          ].map(({ label, connected, value }, index) => (
            <Fragment key={label}>
              {index > 0 ? <SectionDivider orientation="vertical" flexItem /> : null}
              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                <StatusReadout
                  density="compact"
                  label={label}
                  value={value}
                  tone={connected ? 'success' : 'error'}
                />
              </Box>
            </Fragment>
          ))}
        </Stack>
      </Box>
      {hasDetails ? (
        <Stack spacing={1} sx={{ pb: 1 }}>
          {canAdmin && (!status.botConnected || !status.broadcasterConnected) ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="center">
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
                  onClick={() =>
                    window.location.assign('/api/integrations/twitch/oauth/broadcaster')
                  }
                >
                  {t('gameQuiz.twitch.connectChannel')}
                </AppButton>
              ) : null}
            </Stack>
          ) : null}
          {publication?.status === 'uncertain' ? (
            <InlineNotice severity="warning">{t('gameQuiz.twitch.uncertainWarning')}</InlineNotice>
          ) : null}
          {publication?.lastError || status.lastError ? (
            <InlineNotice severity={publication?.status === 'uncertain' ? 'warning' : 'error'}>
              {t('gameQuiz.twitch.deliveryError')}
            </InlineNotice>
          ) : null}
          {needsRecovery || unresolvedOutcome ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="center">
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
      ) : null}
    </RoundBriefingPanel>
  )
}
