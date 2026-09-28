import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { AppButton, ItemCard, SectionCard, StatusBadge } from '../../../shared/ui/index.ts'
import { formatHistoryTeamName } from '../model/game-history-formatters.ts'

type GameHistoryRound = components['schemas']['GameHistoryRoundItemDto']

export function CancelledRoundsSection({
  rounds,
  onPreviewCard,
}: {
  rounds: readonly GameHistoryRound[]
  onPreviewCard: (round: GameHistoryRound) => void
}) {
  const { t } = useTranslation()
  if (rounds.length === 0) return null

  return (
    <SectionCard surface="inset" sx={{ p: 1.5 }}>
      <Stack spacing={1.1}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={0.75}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="subtitle1">{t('gameHistory.cancelledRounds.title')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('gameHistory.cancelledRounds.description')}
            </Typography>
          </Box>
          <StatusBadge
            size="small"
            color="error"
            variant="outlined"
            label={t('gameHistory.cancelledRounds.count', { count: rounds.length })}
          />
        </Stack>

        {rounds.map((round) => (
          <ItemCard key={round.roundId}>
            <Stack spacing={0.75}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={0.75}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2">
                    {round.cellTitle?.trim() || t('gameHistory.cardDialogFallbackTitle')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatHistoryTeamName(t, round.teamName, round.teamSlotIndex)}
                  </Typography>
                </Box>
                <AppButton size="small" tone="secondary" onClick={() => onPreviewCard(round)}>
                  {t('common.actions.openCard')}
                </AppButton>
              </Stack>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                <StatusBadge
                  size="small"
                  variant="outlined"
                  label={t('gameHistory.cancelledRounds.stage', {
                    stage: t(
                      `gameHistory.cancelledRounds.stageValue.${round.technicalCancellationStage ?? 'unknown'}`,
                    ),
                  })}
                />
                <StatusBadge
                  size="small"
                  variant="outlined"
                  label={t(
                    `gameHistory.cancelledRounds.reason.${round.technicalCancellationReasonCode ?? 'unknown'}`,
                  )}
                />
                {round.purchasesRefunded ? (
                  <StatusBadge
                    size="small"
                    color="success"
                    variant="outlined"
                    label={t('gameHistory.cancelledRounds.refunded')}
                  />
                ) : null}
              </Stack>
              {round.publicCancellationSummary ? (
                <Typography variant="body2" color="text.secondary">
                  {round.publicCancellationSummary}
                </Typography>
              ) : null}
            </Stack>
          </ItemCard>
        ))}
      </Stack>
    </SectionCard>
  )
}
