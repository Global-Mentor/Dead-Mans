import { Box, Stack, Typography } from '@mui/material'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import {
  TeamBriefing,
  RoundBriefingDivider,
  RoundBriefingPanel,
} from '../../../shared/game-ui/index.ts'
import { ItemCard, Metric, SectionDivider } from '../../../shared/ui/index.ts'
import {
  formatHistoryTeamName,
  type GameHistoryBoardLabels,
} from '../model/game-history-formatters.ts'
import { sortRoundsByPlaySequence } from '../model/game-history-team-leaderboard.ts'
import type { LeaderboardResult } from '../model/leaderboard-results.ts'
import { LeaderboardRoundRow } from './LeaderboardRoundRow.tsx'

type GameHistoryRound = components['schemas']['GameHistoryRoundItemDto']

export function CurrentLeaderboardTeamDetails({
  entry,
  boardLabels,
  onPreviewCard,
}: {
  entry: LeaderboardResult | null
  boardLabels?: GameHistoryBoardLabels | undefined
  onPreviewCard: (round: GameHistoryRound) => void
}) {
  const { t } = useTranslation()

  if (!entry) {
    return null
  }
  const bestScore = entry.bestScore
  const finalScore = entry.finalScore
  const penaltyTotal = entry.penaltyTotal
  const totalKills = entry.totalKills
  const totalBounties = entry.totalBounties
  const roundsByPlaySequence = sortRoundsByPlaySequence(entry.rounds)
  const count = (value: number | null) =>
    value === null ? t('gameHistory.notAvailable') : t('gameHistory.countValue', { count: value })
  const points = (value: number | null) =>
    value === null ? t('gameHistory.notAvailable') : t('gameHistory.pointsValue', { points: value })
  const metricPairs = [
    [
      ['gameHistory.table.rank', count(entry.rank)],
      ['gameHistory.table.rounds', count(entry.roundsPlayed)],
    ],
    [
      [
        'gameHistory.table.final',
        finalScore === null ? t('gameHistory.finalResultDidNotPlay') : points(finalScore),
      ],
      ['gameHistory.summary.penaltyTotal', points(penaltyTotal)],
    ],
    [
      ['gameHistory.summary.bestScore', points(bestScore)],
      ['gameHistory.summary.averageScore', points(entry.averageScore)],
    ],
    [
      ['gameHistory.summary.totalKills', count(totalKills)],
      ['gameHistory.summary.totalBounties', count(totalBounties)],
    ],
  ] as const

  return (
    <RoundBriefingPanel
      id="leaderboard-team-details"
      data-testid="current-leaderboard-team-details"
      sx={{ minHeight: 0, containerType: 'inline-size', containerName: 'team-results' }}
      header={
        <Typography component="h2" variant="h6" textAlign="center">
          {t('gameHistory.teamResultsTitle')}
        </Typography>
      }
    >
      <Stack
        spacing={1.15}
        sx={{ minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain' }}
      >
        <ItemCard>
          <TeamBriefing
            name={formatHistoryTeamName(t, entry.teamName, entry.teamSlotIndex)}
            participants={entry.participantNames}
            emptyLabel={t('gameHistory.noParticipants')}
          />
        </ItemCard>
        <RoundBriefingPanel
          component="section"
          aria-label={t('gameHistory.statisticsTab')}
          sx={{ px: 1, py: 0 }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
              gap: 1,
              alignItems: 'stretch',
              '@container team-results (min-width: 600px)': {
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr) auto) minmax(0, 1fr)',
              },
            }}
          >
            {metricPairs.map((pair, index) => (
              <Fragment key={pair[0][0]}>
                <Box
                  sx={{
                    minWidth: 0,
                    display: 'grid',
                    gridTemplateRows: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                  }}
                >
                  {pair.map(([label, value], metricIndex) => (
                    <Fragment key={label}>
                      {metricIndex ? <RoundBriefingDivider /> : null}
                      <Box
                        sx={{
                          minWidth: 0,
                          py: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Metric
                          appearance="summary"
                          density="compact"
                          emphasis="label"
                          label={t(label)}
                          value={value}
                        />
                      </Box>
                    </Fragment>
                  ))}
                </Box>
                {index < metricPairs.length - 1 ? (
                  index === 1 ? (
                    <>
                      <SectionDivider
                        orientation="vertical"
                        flexItem
                        sx={{
                          display: 'none',
                          '@container team-results (min-width: 600px)': { display: 'block' },
                        }}
                      />
                      <RoundBriefingDivider
                        sx={{
                          gridColumn: '1 / -1',
                          '@container team-results (min-width: 600px)': { display: 'none' },
                        }}
                      />
                    </>
                  ) : (
                    <SectionDivider orientation="vertical" flexItem />
                  )
                ) : null}
              </Fragment>
            ))}
          </Box>
        </RoundBriefingPanel>

        <RoundBriefingDivider />

        <Stack spacing={0.7}>
          <Typography variant="overline" color="text.secondary" textAlign="center">
            {t('gameHistory.summary.allRoundsTitle')}
          </Typography>
          {roundsByPlaySequence.map((round) => (
            <LeaderboardRoundRow
              key={round.roundId}
              round={round}
              boardLabels={boardLabels}
              isBestRound={round.roundId === entry.bestRoundId}
              onPreviewCard={onPreviewCard}
            />
          ))}
        </Stack>
      </Stack>
    </RoundBriefingPanel>
  )
}
