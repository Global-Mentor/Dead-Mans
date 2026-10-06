import { Box, Typography, useMediaQuery } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { AppButton, AppDialog, ItemCard } from '../../../shared/ui/index.ts'
import type { GameHistoryBoardLabels } from '../model/game-history-formatters.ts'
import type { LeaderboardResult } from '../model/leaderboard-results.ts'
import { CurrentLeaderboardTable } from './CurrentLeaderboardTable.tsx'
import { CurrentLeaderboardTeamDetails } from './CurrentLeaderboardTeamDetails.tsx'

export function GameTeamResults({
  selectedTeamId,
  onSelectTeam,
  results,
  boardLabels,
  onPreviewCard,
  archived = false,
}: {
  selectedTeamId: string | null
  onSelectTeam: (teamId: string) => void
  results: readonly LeaderboardResult[]
  boardLabels?: GameHistoryBoardLabels | undefined
  onPreviewCard: (round: components['schemas']['GameHistoryRoundItemDto']) => void
  archived?: boolean
}) {
  const { t } = useTranslation()
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  // The archive also reserves a 300px picker beside this workspace.
  const isWide = useMediaQuery(archived ? '(min-width: 1400px)' : '(min-width: 1000px)')
  const isPhone = useMediaQuery('(max-width: 599px)')
  const selectedEntry =
    results.find((entry) => entry.teamId === selectedTeamId) ?? results[0] ?? null
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {results.length === 0 ? (
        <ItemCard>
          <Typography variant="body2" color="text.secondary">
            {t('gameHistory.currentRoundsMissing')}
          </Typography>
        </ItemCard>
      ) : (
        <Box
          data-testid="current-leaderboard-grid"
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateRows: 'minmax(0, 1fr)',
            gap: 1,
            gridTemplateColumns: isWide ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)',
            alignItems: 'stretch',
          }}
        >
          <CurrentLeaderboardTable
            entries={results}
            inlineDetails={isWide}
            selectedTeamId={selectedEntry?.teamId ?? null}
            onSelectTeam={(teamId) => {
              onSelectTeam(teamId)
              if (!isWide) setTeamDialogOpen(true)
            }}
          />

          {isWide ? (
            <CurrentLeaderboardTeamDetails
              key={selectedEntry?.teamId}
              entry={selectedEntry}
              boardLabels={boardLabels}
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
          boardLabels={boardLabels}
          onPreviewCard={onPreviewCard}
        />
      </AppDialog>
    </Box>
  )
}
