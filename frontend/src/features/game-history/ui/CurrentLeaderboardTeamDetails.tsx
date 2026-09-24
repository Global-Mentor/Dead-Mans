import { Box, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { AppButton, ItemCard, Metric, RankBadge, StatusBadge } from '../../../shared/ui/index.ts'
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
    <ItemCard
      id="leaderboard-team-details"
      data-testid="current-leaderboard-team-details"
      sx={{
        minWidth: 0,
        overflow: 'hidden',
        '@media (min-width: 1000px) and (min-height: 680px)': {
          maxHeight: 'var(--leaderboard-panel-height)',
          overflowY: 'auto',
          overscrollBehaviorY: 'contain',
          scrollbarGutter: 'stable',
        },
      }}
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
          <Box sx={{ textAlign: 'right', minWidth: 0 }}>
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
          <Metric
            label={t('gameHistory.table.rounds')}
            value={t('gameHistory.countValue', { count: entry.roundsPlayed })}
          />
          <Metric
            label={t('gameHistory.summary.penaltyTotal')}
            value={t('gameHistory.pointsValue', { points: penaltyTotal })}
          />
          <Metric
            label={t('gameHistory.summary.bestScore')}
            value={t('gameHistory.pointsValue', { points: bestScore })}
          />
          <Metric
            label={t('gameHistory.summary.averageScore')}
            value={t('gameHistory.pointsValue', { points: entry.averageScore })}
          />
          <Metric
            label={t('gameHistory.summary.totalKills')}
            value={t('gameHistory.countValue', { count: totalKills })}
          />
          <Metric
            label={t('gameHistory.summary.totalBounties')}
            value={t('gameHistory.countValue', { count: totalBounties })}
          />
        </Box>

        <AppButton
          tone="secondary"
          onClick={() => onPreviewCard(entry.bestRound)}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {t('gameHistory.summary.bestCard')}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.25 }}>
            {formatShortCardLabel(entry.bestRound, t)}
          </Typography>
        </AppButton>

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
    </ItemCard>
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
    <ItemCard emphasis={isBestRound ? 'selected' : 'none'}>
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
            <StatusBadge
              density="compact"
              variant="outlined"
              label={t('gameHistory.cardCostLabel', { cost: round.cellCost })}
            />
            <StatusBadge
              density="compact"
              variant="outlined"
              label={t('gameHistory.summary.killsShort', {
                count: round.scoreDetails.totalKillCount,
              })}
            />
            <StatusBadge
              density="compact"
              variant="outlined"
              label={t('gameHistory.summary.bountiesShort', { count: round.bountyCount })}
            />
            <StatusBadge
              density="compact"
              variant="outlined"
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
    </ItemCard>
  )
}
