import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import { ParticipantNamesList, RoundBriefingPanel } from '../../../shared/game-ui/index.ts'
import { HelpTooltip, RankBadge, SelectionRow } from '../../../shared/ui/index.ts'
import { formatHistoryTeamName } from '../model/game-history-formatters.ts'
import type { LeaderboardResult } from '../model/leaderboard-results.ts'

const columns = '44px minmax(0, 1fr) minmax(44px, 0.35fr)'
const roundsVisibility = {
  display: 'none',
  '@container standings (min-width: 480px)': { display: 'block' },
}
const rowLayout = {
  display: 'grid',
  gridTemplateColumns: columns,
  '@container standings (min-width: 480px)': {
    gridTemplateColumns:
      '44px minmax(0, 1fr) minmax(48px, 0.3fr) repeat(2, minmax(60px, 0.4fr)) minmax(56px, 0.35fr)',
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
              sx={{ fontWeight: 700, ...(index >= 2 && index <= 4 ? roundsVisibility : {}) }}
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
                selectionAppearance="outline"
                aria-label={formatHistoryTeamName(t, entry.teamName, entry.teamSlotIndex)}
                aria-controls={inlineDetails ? 'leaderboard-team-details' : undefined}
                aria-haspopup={inlineDetails ? undefined : 'dialog'}
                onClick={() => onSelectTeam(entry.teamId)}
                tone={index % 2 ? 'alternate' : 'default'}
                sx={{ ...rowLayout, width: '100%', flexShrink: 0 }}
              >
                <Box role="cell" sx={{ display: 'flex', justifyContent: 'center' }}>
                  {entry.rank ? (
                    <RankBadge rank={entry.rank} compact />
                  ) : (
                    t('gameHistory.notAvailable')
                  )}
                </Box>
                <Box role="cell" sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    textAlign="center"
                    sx={{ fontWeight: 700, overflowWrap: 'anywhere', minWidth: 0, mb: 0.5 }}
                  >
                    {formatHistoryTeamName(t, entry.teamName, entry.teamSlotIndex)}
                  </Typography>
                  <ParticipantNamesList
                    names={entry.participantNames}
                    emptyLabel={t('gameHistory.noParticipants')}
                    variant="caption"
                    leadingMarker
                    alignment="center"
                    direction="column"
                    dense
                  />
                </Box>
                <Typography
                  role="cell"
                  variant="body2"
                  textAlign="center"
                  sx={{ fontVariantNumeric: 'tabular-nums', ...roundsVisibility }}
                >
                  {entry.roundsPlayed}
                </Typography>
                <Typography
                  role="cell"
                  variant="body2"
                  textAlign="center"
                  sx={{ fontVariantNumeric: 'tabular-nums', ...roundsVisibility }}
                >
                  {entry.totalKills}
                </Typography>
                <Typography
                  role="cell"
                  variant="body2"
                  textAlign="center"
                  sx={{ fontVariantNumeric: 'tabular-nums', ...roundsVisibility }}
                >
                  {entry.totalBounties}
                </Typography>
                <Typography
                  role="cell"
                  variant="body2"
                  textAlign="center"
                  sx={{ fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}
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
