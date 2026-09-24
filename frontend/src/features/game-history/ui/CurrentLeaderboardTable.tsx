import { Box, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { AppButton, ItemCard, RankBadge, StatusBadge } from '../../../shared/ui/index.ts'
import { formatHistoryTeamName } from '../model/game-history-formatters.ts'
import {
  getTeamBestScore,
  getTeamFinalScore,
  getTeamPenaltyTotal,
  type GameHistoryTeamLeaderboardEntry,
} from '../model/game-history-team-leaderboard.ts'
import { ColumnLabel, TableValue } from './game-history-display.tsx'

export function CurrentLeaderboardTable({
  entries,
  selectedTeamId,
  onSelectTeam,
  inlineDetails = true,
}: {
  entries: readonly GameHistoryTeamLeaderboardEntry[]
  selectedTeamId: string | null
  onSelectTeam: (teamId: string) => void
  inlineDetails?: boolean
}) {
  const { t } = useTranslation()

  return (
    <ItemCard
      data-testid="current-leaderboard-table"
      sx={{
        containerType: 'inline-size',
        containerName: 'standings',
        overflow: 'hidden',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        '@media (min-width: 1000px) and (min-height: 680px)': {
          maxHeight: 'var(--leaderboard-panel-height)',
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={0.8}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={(theme) => ({
          px: 1.25,
          py: 1,
          flexShrink: 0,
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        })}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
            {t('gameHistory.currentTableTitle')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('gameHistory.summary.bestTeamsDescription')}
          </Typography>
        </Box>
        <StatusBadge
          density="compact"
          variant="outlined"
          label={t('gameHistory.summary.teamCountShort', { count: entries.length })}
        />
      </Stack>

      <Box
        role="table"
        aria-label={t('gameHistory.currentTableTitle')}
        sx={{ minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain' }}
      >
        <Box
          role="row"
          sx={(theme) => ({
            display: 'grid',
            gridTemplateColumns: '52px minmax(0, 1fr) 68px',
            gap: 0.75,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 1,
            backgroundColor: theme.palette.background.paper,
            px: 1.25,
            py: 0.65,
            color: 'text.secondary',
            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            '& > :nth-of-type(n+4)': { display: 'none' },
            '@container standings (min-width: 620px)': {
              gridTemplateColumns: '52px minmax(0, 1fr) repeat(4, 68px)',
              '& > :nth-of-type(n+4)': { display: 'block' },
            },
          })}
        >
          <ColumnLabel>{t('gameHistory.table.rank')}</ColumnLabel>
          <ColumnLabel>{t('common.entities.team')}</ColumnLabel>
          <ColumnLabel align="right">{t('gameHistory.table.final')}</ColumnLabel>
          <ColumnLabel align="right">{t('gameHistory.table.penalties')}</ColumnLabel>
          <ColumnLabel align="right">{t('gameHistory.table.best')}</ColumnLabel>
          <ColumnLabel align="right">{t('gameHistory.table.rounds')}</ColumnLabel>
        </Box>

        <Stack role="rowgroup">
          {entries.map((entry, index) => (
            <CurrentLeaderboardTableRow
              key={entry.teamId}
              entry={entry}
              rank={index + 1}
              isSelected={entry.teamId === selectedTeamId}
              inlineDetails={inlineDetails}
              onSelect={() => onSelectTeam(entry.teamId)}
            />
          ))}
        </Stack>
      </Box>
    </ItemCard>
  )
}

function CurrentLeaderboardTableRow({
  entry,
  rank,
  isSelected,
  onSelect,
  inlineDetails,
}: {
  entry: GameHistoryTeamLeaderboardEntry
  rank: number
  isSelected: boolean
  onSelect: () => void
  inlineDetails: boolean
}) {
  const { t } = useTranslation()
  const bestScore = getTeamBestScore(entry)
  const finalScore = getTeamFinalScore(entry)
  const penaltyTotal = getTeamPenaltyTotal(entry)

  return (
    <ItemCard
      role="row"
      emphasis={isSelected ? 'selected' : 'none'}
      sx={{ width: '100%', minWidth: 0, color: 'inherit', textAlign: 'left' }}
    >
      <Box
        sx={{
          display: 'grid',
          gap: 0.75,
          gridTemplateColumns: '52px minmax(0, 1fr) 68px',
          '@container standings (min-width: 620px)': {
            gridTemplateColumns: '52px minmax(0, 1fr) repeat(4, 68px)',
          },
          alignItems: 'center',
        }}
      >
        <Box role="cell">
          <RankBadge rank={rank} compact />
        </Box>

        <Box role="cell" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          <AppButton
            type="button"
            aria-pressed={isSelected}
            aria-controls={inlineDetails ? 'leaderboard-team-details' : undefined}
            aria-haspopup={inlineDetails ? undefined : 'dialog'}
            onClick={onSelect}
            tone="ghost"
            sx={{ width: '100%', justifyContent: 'flex-start' }}
          >
            <Typography variant="body2" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
              {formatHistoryTeamName(t, entry.teamName, entry.teamSlotIndex)}
            </Typography>
          </AppButton>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {entry.participantNames.length > 0
              ? entry.participantNames.join(', ')
              : t('gameHistory.noParticipants')}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              '@container standings (min-width: 620px)': { display: 'none' },
            }}
          >
            {t('gameHistory.summary.bestAndPenaltyShort', {
              best: bestScore,
              penalty: penaltyTotal,
            })}
          </Typography>
        </Box>

        <TableValue strong>{finalScore}</TableValue>
        <TableValue hideOnMobile>{penaltyTotal}</TableValue>
        <TableValue hideOnMobile>{bestScore}</TableValue>
        <TableValue hideOnMobile>{entry.roundsPlayed}</TableValue>
      </Box>
    </ItemCard>
  )
}
