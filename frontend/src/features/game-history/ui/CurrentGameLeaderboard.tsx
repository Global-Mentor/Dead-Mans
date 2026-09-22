import { Box, Stack, Typography, useMediaQuery } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { AppButton, AppDialog } from '../../../shared/ui/index.ts'
import { type GameHistoryTeamLeaderboardEntry } from '../model/game-history-team-leaderboard.ts'
import { CancelledRoundsSection } from './CancelledRoundsSection.tsx'
import { CurrentLeaderboardTable } from './CurrentLeaderboardTable.tsx'
import { CurrentLeaderboardTeamDetails } from './CurrentLeaderboardTeamDetails.tsx'
import { GameModifierHistorySummary } from './GameModifierHistorySummary.tsx'
import { useLeaderboardViewport } from './use-leaderboard-viewport.ts'

type GameHistoryGameDetails = components['schemas']['GameHistoryGameDetailsDto']
type GameHistoryRound = components['schemas']['GameHistoryRoundItemDto']

export function CurrentGameLeaderboard({
  gameDetails,
  leaderboard,
  onPreviewCard,
}: {
  gameDetails: GameHistoryGameDetails | null
  leaderboard: GameHistoryTeamLeaderboardEntry[]
  onPreviewCard: (round: GameHistoryRound) => void
}) {
  const { t } = useTranslation()
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const isWide = useMediaQuery('(min-width: 1000px)')
  const isPhone = useMediaQuery('(max-width: 599px)')
  const leaderboardGridRef = useLeaderboardViewport()

  if (!gameDetails) {
    return null
  }

  const topEntry = leaderboard[0] ?? null
  const selectedEntry =
    leaderboard.find((entry) => entry.teamId === selectedTeamId) ?? topEntry ?? null
  const cancelledRounds = gameDetails.mainGame.rounds.filter(
    (round) => round.status === 'cancelled',
  )
  const relevantModifierSnapshots = gameDetails.modifierSnapshots.filter(
    (snapshot) =>
      snapshot.successfulActivationsCount > 0 ||
      snapshot.cancelledActivationsCount > 0 ||
      snapshot.resultsCount > 0 ||
      snapshot.isEmergencyDisabled,
  )

  return (
    <Stack spacing={1}>
      {leaderboard.length === 0 ? (
        <Box
          sx={(theme) => ({
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.warning.main, 0.07),
            boxShadow: `inset 2px 0 0 ${alpha(theme.palette.warning.main, 0.55)}`,
            px: 1.5,
            py: 1.35,
          })}
        >
          <Typography variant="body2" color="text.secondary">
            {t('gameHistory.currentRoundsMissing')}
          </Typography>
        </Box>
      ) : (
        <Box
          ref={leaderboardGridRef}
          data-testid="current-leaderboard-grid"
          sx={{
            display: 'grid',
            gap: 1,
            gridTemplateColumns: 'minmax(0, 1fr)',
            '@media (min-width: 1000px)': {
              gridTemplateColumns: 'minmax(0, 1.22fr) minmax(340px, 0.78fr)',
            },
            alignItems: 'start',
          }}
        >
          <CurrentLeaderboardTable
            entries={leaderboard}
            selectedTeamId={selectedEntry?.teamId ?? null}
            onSelectTeam={(teamId) => {
              setSelectedTeamId(teamId)
              if (!isWide) setTeamDialogOpen(true)
            }}
          />

          {isWide ? (
            <CurrentLeaderboardTeamDetails
              key={selectedEntry?.teamId}
              entry={selectedEntry}
              rank={
                selectedEntry
                  ? leaderboard.findIndex((entry) => entry.teamId === selectedEntry.teamId) + 1
                  : 0
              }
              onPreviewCard={onPreviewCard}
            />
          ) : null}
        </Box>
      )}
      <AppDialog
        fullScreen={isPhone}
        open={!isWide && teamDialogOpen}
        onClose={() => setTeamDialogOpen(false)}
        title={t('common.entities.team')}
        actions={
          <AppButton tone="secondary" onClick={() => setTeamDialogOpen(false)}>
            {t('common.actions.close')}
          </AppButton>
        }
        sx={{
          '& .MuiDialogContent-root': { p: { xs: 1, sm: 2 } },
          '& .MuiDialog-paper': { borderColor: 'primary.dark' },
        }}
      >
        <CurrentLeaderboardTeamDetails
          key={selectedEntry?.teamId}
          entry={selectedEntry}
          rank={
            selectedEntry
              ? leaderboard.findIndex((entry) => entry.teamId === selectedEntry.teamId) + 1
              : 0
          }
          onPreviewCard={onPreviewCard}
        />
      </AppDialog>
      <CancelledRoundsSection rounds={cancelledRounds} onPreviewCard={onPreviewCard} />
      <GameModifierHistorySummary
        rounds={gameDetails.mainGame.rounds}
        snapshots={relevantModifierSnapshots}
        snapshotStatus={gameDetails.modifierSnapshotStatus}
        collapsible
      />
    </Stack>
  )
}
