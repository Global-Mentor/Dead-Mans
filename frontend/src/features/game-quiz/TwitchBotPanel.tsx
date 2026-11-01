import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { TwitchBotStatus } from '../../shared/api/contracts/index.ts'
import { RoundBriefingDivider, RoundBriefingPanel } from '../../shared/game-ui/index.ts'
import { AppButton, InlineNotice, SectionDivider, StatusReadout } from '../../shared/ui/index.ts'
type Props = {
  status: TwitchBotStatus
  canAdmin: boolean
  busy: boolean
  onConnectEventSub: () => void
  onRetry: () => void
  onCancel: () => void
  onSkipOutcome: () => void
}

export function TwitchBotPanel({
  status,
  canAdmin,
  busy,
  onConnectEventSub,
  onRetry,
  onCancel,
  onSkipOutcome,
}: Props) {
  const { t } = useTranslation()
  const publication = status.publication
  const needsRecovery = publication?.status === 'failed' || publication?.status === 'uncertain'
  const unresolvedOutcome =
    publication?.outcomeDeliveryStatus === 'failed' ||
    publication?.outcomeDeliveryStatus === 'uncertain'
  const hasDetails =
    needsRecovery || unresolvedOutcome || Boolean(publication?.lastError || status.lastError)

  return (
    <RoundBriefingPanel
      component="section"
      aria-label={t('gameQuiz.twitch.title')}
      sx={{ px: 1, py: 0 }}
    >
      <Typography
        component="h3"
        variant="h6"
        color="primary.light"
        textAlign="center"
        sx={{ py: 1 }}
      >
        {t('gameQuiz.twitch.title')}
      </Typography>
      <RoundBriefingDivider />
      {!status.enabled ? (
        <InlineNotice severity="info" sx={{ my: 1 }}>
          {t('gameQuiz.twitch.disabled')}
        </InlineNotice>
      ) : (
        <Stack spacing={1} divider={<SectionDivider />} sx={{ py: 1 }}>
          {[
            {
              label: t('gameQuiz.twitch.botLabel'),
              connected: status.botConnected,
              value: t(
                status.botConnected
                  ? 'gameQuiz.twitch.botConnected'
                  : 'gameQuiz.twitch.botDisconnected',
              ),
              action: t('gameQuiz.twitch.connectBot'),
              onClick: () => window.location.assign('/api/integrations/twitch/oauth/bot'),
              disabled: busy,
            },
            {
              label: t('gameQuiz.twitch.channelLabel'),
              connected: status.broadcasterConnected,
              value: t(
                status.broadcasterConnected
                  ? 'gameQuiz.twitch.channelConnected'
                  : 'gameQuiz.twitch.channelDisconnected',
              ),
              action: t('gameQuiz.twitch.connectChannel'),
              onClick: () => window.location.assign('/api/integrations/twitch/oauth/broadcaster'),
              disabled: busy,
            },
            {
              label: t('gameQuiz.twitch.eventSubLabel'),
              connected: status.eventSubConnected,
              value: t(
                status.eventSubConnected
                  ? 'gameQuiz.twitch.eventSubConnected'
                  : 'gameQuiz.twitch.eventSubDisconnected',
              ),
              action: t('gameQuiz.twitch.connectEventSub'),
              onClick: onConnectEventSub,
              disabled: busy || !status.botConnected || !status.broadcasterConnected,
            },
          ].map(({ label, connected, value, action, onClick, disabled }) => (
            <Box
              key={label}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <Box sx={{ flex: '1 1 150px', minWidth: 0 }}>
                <StatusReadout
                  density="compact"
                  label={label}
                  value={value}
                  tone={connected ? 'success' : 'error'}
                />
              </Box>
              {canAdmin && !connected ? (
                <AppButton size="small" tone="secondary" disabled={disabled} onClick={onClick}>
                  {action}
                </AppButton>
              ) : null}
            </Box>
          ))}
          {!status.eventSubConnected && (!status.botConnected || !status.broadcasterConnected) ? (
            <Typography variant="body2" color="text.secondary">
              {t('gameQuiz.twitch.accountsRequired')}
            </Typography>
          ) : null}
        </Stack>
      )}
      {hasDetails ? (
        <Stack spacing={1} sx={{ pb: 1 }}>
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
