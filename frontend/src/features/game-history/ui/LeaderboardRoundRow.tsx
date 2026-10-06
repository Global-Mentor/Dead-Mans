import { Box, Stack, SvgIcon, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { RoundBriefingDivider } from '../../../shared/game-ui/index.ts'
import { AppButton, HelpTooltip, ItemCard, StatusBadge } from '../../../shared/ui/index.ts'
import {
  formatCurrentCardLabel,
  type GameHistoryBoardLabels,
} from '../model/game-history-formatters.ts'
import { getRoundScore } from '../model/game-history-team-leaderboard.ts'
type GameHistoryRound = components['schemas']['GameHistoryRoundItemDto']
export function LeaderboardRoundRow({
  round,
  boardLabels,
  isBestRound = false,
  onPreviewCard,
}: {
  round: GameHistoryRound
  boardLabels?: GameHistoryBoardLabels | undefined
  isBestRound?: boolean
  onPreviewCard: (round: GameHistoryRound) => void
}) {
  const { t } = useTranslation()
  const modifiersCount = round.modifiers?.length ?? 0
  const score = getRoundScore(round)
  const penalty = round.scoreDetails.penaltyTotal
  const resultColor = score > 0 ? 'success' : score < 0 ? 'error' : 'default'
  const resultPoints = t('gameHistory.pointsValue', { points: score > 0 ? `+${score}` : score })

  return (
    <ItemCard
      component="article"
      aria-labelledby={`leaderboard-card-${round.roundId}`}
      frame={isBestRound ? 'corner' : 'standard'}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 1,
          alignItems: 'center',
        }}
      >
        <Stack spacing={0.8} sx={{ minWidth: 0 }}>
          <Stack spacing={0.5} sx={{ width: 'fit-content', maxWidth: '100%' }}>
            <Typography
              id={`leaderboard-card-${round.roundId}`}
              component="h4"
              variant="body1"
              color="primary.light"
              fontWeight={700}
              sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
            >
              {formatCurrentCardLabel(round, boardLabels, t)}
            </Typography>
            <RoundBriefingDivider />
          </Stack>

          <Stack direction="row" spacing={0.55} alignItems="center" flexWrap="wrap" useFlexGap>
            <StatusBadge
              density="compact"
              appearance="textured"
              color={resultColor}
              variant="outlined"
              label={t('gameHistory.summary.finalScoreShort', { points: resultPoints })}
            />
            {penalty > 0 ? (
              <StatusBadge
                density="tight"
                variant="outlined"
                label={t('gameHistory.summary.penaltyTotalShort', {
                  points: t('gameHistory.pointsValue', { points: -penalty }),
                })}
              />
            ) : null}
            <StatusBadge
              density="tight"
              variant="outlined"
              label={t('gameHistory.cardCostLabel', { cost: round.cellCost })}
            />
            <StatusBadge
              density="tight"
              variant="outlined"
              label={t('gameHistory.summary.killsShort', {
                count: round.scoreDetails.totalKillCount,
              })}
            />
            <StatusBadge
              density="tight"
              variant="outlined"
              label={t('gameHistory.summary.bountiesShort', { count: round.bountyCount })}
            />
            <StatusBadge
              density="tight"
              variant="outlined"
              label={t('gameHistory.summary.modifierCountShort', { count: modifiersCount })}
            />
          </Stack>
        </Stack>
        <HelpTooltip title={t('common.actions.openCard')} arrow describeChild enterTouchDelay={0}>
          <AppButton
            size="small"
            tone="secondary"
            aria-label={t('common.actions.openCard')}
            onClick={() => onPreviewCard(round)}
            startIcon={
              <SvgIcon fontSize="small" aria-hidden>
                <path
                  d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </SvgIcon>
            }
          >
            {t('common.entities.card')}
          </AppButton>
        </HelpTooltip>
      </Box>
    </ItemCard>
  )
}
