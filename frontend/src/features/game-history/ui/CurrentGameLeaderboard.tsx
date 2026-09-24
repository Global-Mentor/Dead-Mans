import { Box, Stack, Typography, useMediaQuery } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { useViewportPanelHeight } from '../../../shared/lib/use-viewport-panel-height.ts'
import { AppButton, AppDialog, ContentTabs, ItemCard } from '../../../shared/ui/index.ts'
import { type GameHistoryTeamLeaderboardEntry } from '../model/game-history-team-leaderboard.ts'
import { CancelledRoundsSection } from './CancelledRoundsSection.tsx'
import { CurrentLeaderboardTable } from './CurrentLeaderboardTable.tsx'
import { CurrentLeaderboardTeamDetails } from './CurrentLeaderboardTeamDetails.tsx'
import { GameModifierHistorySummary } from './GameModifierHistorySummary.tsx'
import { QuizLeaderboard } from './QuizLeaderboard.tsx'

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
  const leaderboardGridRef = useViewportPanelHeight('--leaderboard-panel-height', 340)

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
      <ContentTabs
        label={t('gameHistory.title')}
        items={[
          {
            id: 'teams',
            label: t('common.entities.teams'),
            content: (
              <>
                {leaderboard.length === 0 ? (
                  <ItemCard>
                    <Typography variant="body2" color="text.secondary">
                      {t('gameHistory.currentRoundsMissing')}
                    </Typography>
                  </ItemCard>
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
                      inlineDetails={isWide}
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
                            ? leaderboard.findIndex(
                                (entry) => entry.teamId === selectedEntry.teamId,
                              ) + 1
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
                  contentDensity="compact"
                >
                  <CurrentLeaderboardTeamDetails
                    key={selectedEntry?.teamId}
                    entry={selectedEntry}
                    rank={
                      selectedEntry
                        ? leaderboard.findIndex((entry) => entry.teamId === selectedEntry.teamId) +
                          1
                        : 0
                    }
                    onPreviewCard={onPreviewCard}
                  />
                </AppDialog>
              </>
            ),
          },
          {
            id: 'quiz',
            label: t('gameHistory.quizLeaderboardTitle'),
            content: <QuizLeaderboard entries={gameDetails.quiz.playerStats} defaultExpanded />,
          },
        ]}
      />
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
