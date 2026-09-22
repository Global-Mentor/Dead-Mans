import { Box, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { AppButton } from '../../../shared/ui/index.ts'
import { formatHistoryTeamName, formatShortCardLabel } from '../model/game-history-formatters.ts'
import {
  getRoundScore,
  getTeamBestScore,
  getTeamFinalScore,
  getTeamPenaltyTotal,
  getTeamTotalBounties,
  getTeamTotalKills,
  sortRoundsByPlaySequence,
  type GameHistoryTeamLeaderboardEntry,
} from '../model/game-history-team-leaderboard.ts'
import { CompactMetric, MiniMetricChip, RankBadge } from './game-history-display.tsx'

type GameHistoryRound = components['schemas']['GameHistoryRoundItemDto']

export function CurrentLeaderboardTeamDetails({
  entry,
  rank,
  onPreviewCard,
}: {
  entry: GameHistoryTeamLeaderboardEntry | null
  rank: number
  onPreviewCard: (round: GameHistoryRound) => void
}) {
  const { t } = useTranslation()

  if (!entry) {
    return null
  }
  const bestScore = getTeamBestScore(entry)
  const finalScore = getTeamFinalScore(entry)
  const penaltyTotal = getTeamPenaltyTotal(entry)
  const totalKills = getTeamTotalKills(entry)
  const totalBounties = getTeamTotalBounties(entry)
  const roundsByPlaySequence = sortRoundsByPlaySequence(entry.rounds)

  return (
    <Box
      id="leaderboard-team-details"
      data-testid="current-leaderboard-team-details"
      sx={(theme) => ({
        minWidth: 0,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
        backgroundColor: alpha(theme.palette.background.paper, 0.58),
        overflow: 'hidden',
        '@media (min-width: 1000px) and (min-height: 680px)': {
          maxHeight: 'var(--leaderboard-panel-height)',
          overflowY: 'auto',
          overscrollBehaviorY: 'contain',
          scrollbarGutter: 'stable',
        },
      })}
    >
      <Box
        sx={(theme) => ({
          px: 1.35,
          py: 1.2,
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          backgroundColor: theme.palette.background.paper,
          '@media (min-width: 1000px) and (min-height: 680px)': {
            position: 'sticky',
            top: 0,
            zIndex: 1,
            backdropFilter: 'blur(8px)',
          },
        })}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <RankBadge rank={rank} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              component="h2"
              variant="subtitle1"
              sx={{ fontWeight: 900, overflowWrap: 'anywhere' }}
            >
              {formatHistoryTeamName(t, entry.teamName, entry.teamSlotIndex)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
              {entry.participantNames.length > 0
                ? entry.participantNames.join(', ')
                : t('gameHistory.noParticipants')}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary">
              {t('gameHistory.table.final')}
            </Typography>
            <Typography
              sx={{
                fontSize: '1.6rem',
                fontWeight: 900,
                lineHeight: 1.1,
                color: 'primary.light',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {finalScore}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Stack spacing={1.15} sx={{ p: 1.35 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 0.75,
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          }}
        >
          <CompactMetric
            label={t('gameHistory.table.rounds')}
            value={t('gameHistory.countValue', { count: entry.roundsPlayed })}
          />
          <CompactMetric
            label={t('gameHistory.summary.penaltyTotal')}
            value={t('gameHistory.pointsValue', { points: penaltyTotal })}
          />
          <CompactMetric
            label={t('gameHistory.summary.bestScore')}
            value={t('gameHistory.pointsValue', { points: bestScore })}
          />
          <CompactMetric
            label={t('gameHistory.summary.averageScore')}
            value={t('gameHistory.pointsValue', { points: entry.averageScore })}
          />
          <CompactMetric
            label={t('gameHistory.summary.totalKills')}
            value={t('gameHistory.countValue', { count: totalKills })}
          />
          <CompactMetric
            label={t('gameHistory.summary.totalBounties')}
            value={t('gameHistory.countValue', { count: totalBounties })}
          />
        </Box>

        <Box
          component="button"
          type="button"
          onClick={() => onPreviewCard(entry.bestRound)}
          sx={(theme) => ({
            borderRadius: 1.5,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.28)}`,
            backgroundColor: alpha(theme.palette.warning.main, 0.08),
            px: 1,
            py: 0.9,
            cursor: 'pointer',
            color: 'inherit',
            textAlign: 'left',
            '&:hover': { backgroundColor: alpha(theme.palette.warning.main, 0.16) },
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
          })}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {t('gameHistory.summary.bestCard')}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.25 }}>
            {formatShortCardLabel(entry.bestRound, t)}
          </Typography>
        </Box>

        <Stack spacing={0.7}>
          <Typography variant="overline" color="text.secondary">
            {t('gameHistory.summary.allRoundsTitle')}
          </Typography>
          {roundsByPlaySequence.map((round) => (
            <CurrentLeaderboardRoundRow
              key={round.roundId}
              round={round}
              isBestRound={round.roundId === entry.bestRound.roundId}
              onPreviewCard={onPreviewCard}
            />
          ))}
        </Stack>
      </Stack>
    </Box>
  )
}

function CurrentLeaderboardRoundRow({
  round,
  isBestRound,
  onPreviewCard,
}: {
  round: GameHistoryRound
  isBestRound: boolean
  onPreviewCard: (round: GameHistoryRound) => void
}) {
  const { t } = useTranslation()
  const modifiersCount = round.modifiers?.length ?? 0

  return (
    <Box
      sx={(theme) => ({
        borderRadius: 1.5,
        border: '1px solid transparent',
        backgroundColor: isBestRound
          ? alpha(theme.palette.warning.main, 0.1)
          : alpha(theme.palette.common.black, 0.18),
        '&:nth-of-type(even)': {
          backgroundColor: isBestRound
            ? alpha(theme.palette.warning.main, 0.1)
            : alpha(theme.palette.primary.main, 0.065),
        },
        boxShadow: isBestRound
          ? `inset 0 0 0 1px ${alpha(theme.palette.warning.main, 0.28)}`
          : 'none',
        px: 1,
        py: 0.85,
      })}
    >
      <Stack spacing={0.7}>
        <Stack direction="row" spacing={0.8} alignItems="flex-start">
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
              {round.cellTitle || t('gameHistory.cardDialogFallbackTitle')}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 900, flexShrink: 0 }}>
            {t('gameHistory.pointsValue', { points: getRoundScore(round) })}
          </Typography>
        </Stack>

        <Box
          sx={{
            display: 'flex',
            gap: 0.75,
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <Stack direction="row" spacing={0.55} alignItems="center" flexWrap="wrap" useFlexGap>
            <MiniMetricChip label={t('gameHistory.cardCostLabel', { cost: round.cellCost })} />
            <MiniMetricChip
              label={t('gameHistory.summary.killsShort', {
                count: round.scoreDetails.totalKillCount,
              })}
            />
            <MiniMetricChip
              label={t('gameHistory.summary.bountiesShort', { count: round.bountyCount })}
            />
            <MiniMetricChip
              label={t('gameHistory.summary.modifierCountShort', { count: modifiersCount })}
            />
          </Stack>
          <AppButton
            size="small"
            tone="secondary"
            onClick={() => onPreviewCard(round)}
            sx={{ ml: 'auto', flexShrink: 0 }}
          >
            {t('common.actions.openCard')}
          </AppButton>
        </Box>
      </Stack>
    </Box>
  )
}
