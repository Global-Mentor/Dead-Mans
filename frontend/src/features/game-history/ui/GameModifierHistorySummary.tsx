import { Box, Chip, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { modifierHistoryRoute } from '../../../routes/app-routes.ts'
import type { components } from '../../../shared/api/contracts/generated'
import { formatPlayedCardModifierOutcomeStatus } from '../../../shared/lib/played-card-formatters.ts'
import { AppLinkButton, SectionCard } from '../../../shared/ui/index.ts'
import { buildGameHistoryModifierSummary } from '../model/game-history-modifier-summary.ts'

type GameHistoryRound = components['schemas']['GameHistoryRoundItemDto']
type ModifierSnapshot = components['schemas']['GameHistoryModifierSnapshotDto']

export function GameModifierHistorySummary({
  rounds,
  snapshots = [],
  snapshotStatus = 'complete',
  collapsible = false,
}: {
  rounds: readonly GameHistoryRound[]
  snapshots?: readonly ModifierSnapshot[]
  snapshotStatus?: 'complete' | 'legacy_unavailable'
  collapsible?: boolean
}) {
  const { t } = useTranslation()
  const items = buildGameHistoryModifierSummary(rounds)
  if (items.length === 0 && snapshots.length === 0 && snapshotStatus === 'complete') return null

  const header = (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant={collapsible ? 'subtitle2' : 'subtitle1'} sx={{ fontWeight: 850 }}>
        {t('gameHistory.modifierSummary.title')}
      </Typography>
      <Typography className="modifier-summary-description" variant="body2" color="text.secondary">
        {t('gameHistory.modifierSummary.description')}
      </Typography>
    </Box>
  )
  const content = (
    <>
      {snapshotStatus === 'legacy_unavailable' ? (
        <Typography variant="body2" color="warning.main">
          {t('gameHistory.modifierSummary.legacyUnavailable')}
        </Typography>
      ) : null}
      {snapshots.length > 0 ? (
        <Box
          sx={{
            display: 'grid',
            gap: 1,
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
          }}
        >
          {snapshots.map((snapshot) => (
            <Box
              key={snapshot.versionId}
              sx={{ border: 1, borderColor: 'divider', borderRadius: 1.75, p: 1 }}
            >
              <AppLinkButton
                to={`${modifierHistoryRoute.fullPath}?modifierId=${snapshot.modifierId}&revision=${snapshot.revision}`}
                tone="ghost"
                size="small"
              >
                {snapshot.iconEmoji ? `${snapshot.iconEmoji} ` : ''}
                {t('gameHistory.modifierSnapshotLabel', {
                  name: snapshot.name,
                  revision: snapshot.revision,
                })}
              </AppLinkButton>
              <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.75 }}>
                <Chip
                  size="small"
                  color={snapshot.successfulActivationsCount > 0 ? 'success' : 'default'}
                  label={t(
                    snapshot.successfulActivationsCount > 0
                      ? 'gameHistory.modifierSummary.snapshotActivated'
                      : 'gameHistory.modifierSummary.snapshotNotActivated',
                  )}
                />
                {snapshot.cancelledActivationsCount > 0 ? (
                  <Chip
                    size="small"
                    color="warning"
                    label={t('gameHistory.modifierSummary.snapshotCancelled', {
                      count: snapshot.cancelledActivationsCount,
                    })}
                  />
                ) : null}
                {snapshot.resultsCount > 0 ? (
                  <Chip
                    size="small"
                    color="info"
                    label={t('gameHistory.modifierSummary.snapshotResults', {
                      count: snapshot.resultsCount,
                    })}
                  />
                ) : null}
                {snapshot.isEmergencyDisabled ? (
                  <Chip
                    size="small"
                    color="error"
                    label={t('gameHistory.modifierSummary.snapshotEmergency')}
                  />
                ) : null}
              </Stack>
            </Box>
          ))}
        </Box>
      ) : null}
      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        {items.map((item) => (
          <Box
            key={item.key}
            sx={(theme) => ({
              borderRadius: 1.75,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              p: 1,
            })}
          >
            <Stack spacing={0.65}>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                  {item.modifierName}
                </Typography>
                {item.definitionRevision ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={t('gameHistory.modifierRevision', {
                      revision: item.definitionRevision,
                    })}
                  />
                ) : null}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {item.modifierDescription}
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  label={t('gameHistory.modifierSummary.activations', {
                    count: item.activationCount,
                  })}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={t('gameHistory.modifierSummary.rounds', { count: item.roundCount })}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={t('gameHistory.modifierSummary.points', { points: item.pointsDelta })}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={t('gameHistory.modifierSummary.bonusKills', {
                    kills: item.bonusKillsDelta,
                  })}
                />
                {item.outcomes.map((outcome) => (
                  <Chip
                    key={outcome.status}
                    size="small"
                    variant="outlined"
                    label={t('gameHistory.modifierSummary.outcome', {
                      outcome: formatPlayedCardModifierOutcomeStatus(t, outcome.status),
                      count: outcome.count,
                    })}
                  />
                ))}
              </Stack>
            </Stack>
          </Box>
        ))}
      </Box>
    </>
  )

  return (
    <SectionCard surface="inset" sx={{ p: collapsible ? 0 : 1.5, overflow: 'hidden' }}>
      {collapsible ? (
        <Box
          component="details"
          data-testid="modifier-summary-disclosure"
          sx={{
            '&:not([open]) .modifier-summary-description': { display: 'none' },
            '&[open] .modifier-summary-chevron': {
              transform: 'rotate(90deg)',
            },
          }}
        >
          <Box
            component="summary"
            sx={(theme) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: { xs: 1.1, sm: 1.35 },
              py: 0.9,
              cursor: 'pointer',
              listStyle: 'none',
              backgroundColor: alpha(theme.palette.background.paper, 0.22),
              '&::-webkit-details-marker': { display: 'none' },
              '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.06) },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: -2,
              },
            })}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>{header}</Box>
            <Typography
              component="span"
              className="modifier-summary-chevron"
              aria-hidden="true"
              sx={{ fontSize: '1.35rem', lineHeight: 1, transition: 'transform 0.15s ease' }}
            >
              ›
            </Typography>
          </Box>
          <Stack
            spacing={1.1}
            sx={(theme) => ({
              p: { xs: 1.1, sm: 1.35 },
              borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            })}
          >
            {content}
          </Stack>
        </Box>
      ) : (
        <Stack spacing={1.1}>
          {header}
          {content}
        </Stack>
      )}
    </SectionCard>
  )
}
