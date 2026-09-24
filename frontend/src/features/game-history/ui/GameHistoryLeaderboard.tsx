import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import {
  AppAccordion,
  AppAccordionDetails,
  AppAccordionSummary,
  DisclosureSection,
  ItemCard,
  Metric,
  RankBadge,
  StatusBadge,
} from '../../../shared/ui/index.ts'
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
import { LeaderboardRoundCard } from './GameHistoryLeaderboardRound.tsx'
type GameHistoryRound = components['schemas']['GameHistoryRoundItemDto']

export function TeamLeaderboardRow({
  entry,
  rank,
  onPreviewCard,
}: {
  entry: GameHistoryTeamLeaderboardEntry
  rank: number
  onPreviewCard: (round: GameHistoryRound) => void
}) {
  const { t } = useTranslation()
  const roundsByPlaySequence = sortRoundsByPlaySequence(entry.rounds)
  const recentRounds = roundsByPlaySequence.slice(-3)
  const bestScore = getTeamBestScore(entry)
  const finalScore = getTeamFinalScore(entry)
  const penaltyTotal = getTeamPenaltyTotal(entry)
  const totalKills = getTeamTotalKills(entry)
  const totalBounties = getTeamTotalBounties(entry)

  return (
    <AppAccordion>
      <AppAccordionSummary density="compact">
        <Box sx={{ width: '100%' }}>
          <Stack spacing={0.9}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} alignItems="flex-start">
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                <RankBadge rank={rank} />

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Typography variant="body1" sx={{ fontWeight: 800 }}>
                      {formatHistoryTeamName(t, entry.teamName, entry.teamSlotIndex)}
                    </Typography>
                    {rank === 1 || rank === 2 || rank === 3 ? (
                      <StatusBadge
                        size="small"
                        color={rank === 1 ? 'warning' : rank === 2 ? 'default' : 'secondary'}
                        label={t('gameHistory.rank', { returnObjects: true })[rank]}
                      />
                    ) : null}
                    <StatusBadge
                      density="compact"
                      variant="outlined"
                      label={t('gameHistory.summary.roundCountShort', {
                        count: entry.roundsPlayed,
                      })}
                    />
                  </Stack>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 0.35,
                      display: '-webkit-box',
                      overflow: 'hidden',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {entry.participantNames.length > 0
                      ? entry.participantNames.join(', ')
                      : t('gameHistory.noParticipants')}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                <StatusBadge
                  density="compact"
                  variant="outlined"
                  label={t('gameHistory.summary.finalScoreShort', { points: finalScore })}
                />
                <StatusBadge
                  density="compact"
                  variant="outlined"
                  label={t('gameHistory.summary.penaltyTotalShort', {
                    points: penaltyTotal,
                  })}
                />
                <StatusBadge
                  density="compact"
                  variant="outlined"
                  label={t('gameHistory.summary.bestScoreShort', { points: bestScore })}
                />
                <StatusBadge
                  density="compact"
                  variant="outlined"
                  label={t('gameHistory.summary.averageScoreShort', {
                    points: entry.averageScore,
                  })}
                />
                <StatusBadge
                  density="compact"
                  variant="outlined"
                  label={t('gameHistory.summary.killsShort', { count: totalKills })}
                />
                <StatusBadge
                  density="compact"
                  variant="outlined"
                  label={t('gameHistory.summary.bountiesShort', {
                    count: totalBounties,
                  })}
                />
              </Stack>
            </Stack>

            <Stack spacing={0.6}>
              <Typography variant="caption" color="text.secondary">
                {t('gameHistory.summary.recentRounds')}
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {recentRounds.map((round) => (
                  <RecentRoundPill
                    key={round.roundId}
                    round={round}
                    isBestRound={round.roundId === entry.bestRound.roundId}
                  />
                ))}
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </AppAccordionSummary>

      <AppAccordionDetails sx={{ px: 1.4, pt: 0, pb: 1.4 }}>
        <Stack spacing={1.25}>
          <ItemCard
            sx={{
              display: 'grid',
              gap: 0.75,
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            <Metric
              label={t('gameHistory.summary.finalScore')}
              value={t('gameHistory.pointsValue', { points: finalScore })}
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
            <Metric
              label={t('gameHistory.summary.bestCard')}
              value={formatShortCardLabel(entry.bestRound, t)}
            />
          </ItemCard>

          <DisclosureSection
            title={t('gameHistory.summary.allRoundsTitle')}
            description={t('gameHistory.summary.allRoundsDescription')}
            countLabel={t('gameHistory.summary.roundCountShort', {
              count: entry.rounds.length,
            })}
            defaultExpanded={rank === 1}
          >
            <Stack spacing={1}>
              {roundsByPlaySequence.map((round) => (
                <LeaderboardRoundCard
                  key={round.roundId}
                  round={round}
                  isBestRound={round.roundId === entry.bestRound.roundId}
                  onPreviewCard={onPreviewCard}
                />
              ))}
            </Stack>
          </DisclosureSection>
        </Stack>
      </AppAccordionDetails>
    </AppAccordion>
  )
}

function RecentRoundPill({
  round,
  isBestRound,
}: {
  round: GameHistoryRound
  isBestRound: boolean
}) {
  const { t } = useTranslation()

  return (
    <ItemCard emphasis={isBestRound ? 'selected' : 'none'} sx={{ minWidth: 0 }}>
      <Stack spacing={0.25}>
        <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" sx={{ fontWeight: 800 }}>
            {t('gameHistory.pointsValue', { points: getRoundScore(round) })}
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {round.cellTitle || t('gameHistory.cardDialogFallbackTitle')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('gameHistory.summary.killsShort', {
            count: round.scoreDetails.totalKillCount,
          })}{' '}
          · {t('gameHistory.summary.bountiesShort', { count: round.bountyCount })}
        </Typography>
      </Stack>
    </ItemCard>
  )
}
