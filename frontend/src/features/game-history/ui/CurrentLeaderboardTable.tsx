import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import { TeamPresentation, RoundBriefingPanel } from '../../../shared/game-ui/index.ts'
import { HelpTooltip, ItemCard, RankBadge, SelectionRow } from '../../../shared/ui/index.ts'
import { formatHistoryTeamName } from '../model/game-history-formatters.ts'
import type { LeaderboardResult } from '../model/leaderboard-results.ts'

const columns = '44px minmax(0, 1fr) minmax(44px, 0.35fr)'
const rankCellSx = {
  display: 'flex',
  alignSelf: 'stretch',
  alignItems: 'center',
  justifyContent: 'center',
  borderRight: '1px solid',
  borderColor: 'divider',
} as const
const statisticCellSx = {
  minWidth: 0,
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderLeft: '1px solid',
  borderColor: 'divider',
  pl: 0.5,
  fontVariantNumeric: 'tabular-nums',
} as const

const roundsVisibility = {
  display: 'none',
  '@container standings (min-width: 480px)': { display: 'flex' },
}
const rowLayout = {
  display: 'grid',
  gridTemplateColumns: columns,
  '@container standings (min-width: 480px)': {
    gridTemplateColumns:
      '44px minmax(0, 1.2fr) minmax(48px, 0.3fr) repeat(2, minmax(60px, 0.4fr)) minmax(56px, 0.35fr)',
  },
  gap: 0.5,
  alignItems: 'center',
  px: 0.75,
  py: 0.75,
}

export function CurrentLeaderboardTable({
  entries,
  selectedTeamId,
  onSelectTeam,
  inlineDetails = true,
}: {
  entries: readonly LeaderboardResult[]
  selectedTeamId: string | null
  onSelectTeam: (teamId: string) => void
  inlineDetails?: boolean
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  return (
    <RoundBriefingPanel
      data-testid="current-leaderboard-table"
      sx={{ minHeight: 0, containerType: 'inline-size', containerName: 'standings' }}
      header={
        <HelpTooltip title={t('gameHistory.summary.bestTeamsDescription')} describeChild>
          <Typography component="h2" variant="h6" textAlign="center" tabIndex={0}>
            {t('gameHistory.currentTableTitle')}
          </Typography>
        </HelpTooltip>
      }
    >
      <Box
        role="table"
        aria-label={t('gameHistory.currentTableTitle')}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          flex: 1,
        }}
      >
        <Box
          role="row"
          sx={{
            ...rowLayout,
            flexShrink: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
            mb: 0.5,
          }}
        >
          {[
            t('gameHistory.table.rank'),
            t('common.entities.team'),
            t('gameHistory.table.rounds'),
            t('gameHistory.summary.totalKills'),
            t('gameHistory.summary.totalBounties'),
            t('gameHistory.table.final'),
          ].map((label, index) => (
            <Typography
              key={label}
              role="columnheader"
              variant="caption"
              textAlign="center"
              sx={{
                fontWeight: 700,
                ...(index === 0 ? rankCellSx : {}),
                ...(index >= 2 ? statisticCellSx : {}),
                ...(index >= 2 && index <= 4 ? roundsVisibility : {}),
              }}
            >
              {label}
            </Typography>
          ))}
        </Box>
        <Stack
          role="rowgroup"
          spacing={0.5}
          sx={{
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehaviorY: 'contain',
          }}
        >
          {entries.map((entry, index) => {
            const selected = entry.teamId === selectedTeamId
            const ownTeam = entry.rounds.some((round) =>
              round.participants.some((participant) => participant.userId === user?.id),
            )
            return (
              <SelectionRow
                component="div"
                tabIndex={0}
                key={entry.teamId}
                role="row"
                data-own-team={ownTeam || undefined}
                emphasis={ownTeam ? 'selected' : 'none'}
                selected={selected}
                aria-label={formatHistoryTeamName(t, entry.teamName, entry.teamSlotIndex)}
                aria-controls={inlineDetails ? 'leaderboard-team-details' : undefined}
                aria-haspopup={inlineDetails ? undefined : 'dialog'}
                onClick={() => onSelectTeam(entry.teamId)}
                tone={index % 2 ? 'alternate' : 'default'}
                sx={{ ...rowLayout, width: '100%', flexShrink: 0 }}
              >
                <Box role="cell" sx={rankCellSx}>
                  {entry.rank ? (
                    <RankBadge rank={entry.rank} compact />
                  ) : (
                    t('gameHistory.notAvailable')
                  )}
                </Box>
                <ItemCard
                  role="cell"
                  frame={selected ? 'corner' : 'standard'}
                  transparent
                  density="compact"
                  data-testid="leaderboard-team-frame"
                  sx={{ minWidth: 0 }}
                >
                  <TeamPresentation
                    density="compact"
                    name={formatHistoryTeamName(t, entry.teamName, entry.teamSlotIndex)}
                    members={entry.participantNames.map((name, index) => ({
                      id: String(index),
                      name,
                    }))}
                    emptyLabel={t('gameHistory.noParticipants')}
                  />
                </ItemCard>
                <Typography
                  role="cell"
                  variant="body2"
                  textAlign="center"
                  sx={{ ...statisticCellSx, ...roundsVisibility }}
                >
                  {entry.roundsPlayed}
                </Typography>
                <Typography
                  role="cell"
                  variant="body2"
                  textAlign="center"
                  sx={{ ...statisticCellSx, ...roundsVisibility }}
                >
                  {entry.totalKills}
                </Typography>
                <Typography
                  role="cell"
                  variant="body2"
                  textAlign="center"
                  sx={{ ...statisticCellSx, ...roundsVisibility }}
                >
                  {entry.totalBounties}
                </Typography>
                <Typography
                  role="cell"
                  variant="body2"
                  textAlign="center"
                  sx={{ ...statisticCellSx, overflowWrap: 'anywhere' }}
                >
                  {entry.finalScore ?? t('gameHistory.finalResultDidNotPlay')}
                </Typography>
              </SelectionRow>
            )
          })}
        </Stack>
      </Box>
    </RoundBriefingPanel>
  )
}
