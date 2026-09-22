import { Box, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { formatHistoryTeamName } from '../model/game-history-formatters.ts'
import {
  getTeamBestScore,
  getTeamFinalScore,
  getTeamPenaltyTotal,
  type GameHistoryTeamLeaderboardEntry,
} from '../model/game-history-team-leaderboard.ts'
import { ColumnLabel, MiniMetricChip, RankBadge, TableValue } from './game-history-display.tsx'

export function CurrentLeaderboardTable({
  entries,
  selectedTeamId,
  onSelectTeam,
}: {
  entries: readonly GameHistoryTeamLeaderboardEntry[]
  selectedTeamId: string | null
  onSelectTeam: (teamId: string) => void
}) {
  const { t } = useTranslation()

  return (
    <Box
      data-testid="current-leaderboard-table"
      sx={(theme) => ({
        containerType: 'inline-size',
        containerName: 'standings',
        overflow: 'hidden',
        minWidth: 0,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
        backgroundColor: alpha(theme.palette.background.paper, 0.5),
        display: 'flex',
        flexDirection: 'column',
        '@media (min-width: 1000px) and (min-height: 680px)': {
          maxHeight: 'var(--leaderboard-panel-height)',
        },
      })}
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
        <MiniMetricChip
          label={t('gameHistory.summary.teamCountShort', { count: entries.length })}
        />
      </Stack>

      <Box sx={{ minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain' }}>
        <Box
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

        <Stack>
          {entries.map((entry, index) => (
            <CurrentLeaderboardTableRow
              key={entry.teamId}
              entry={entry}
              rank={index + 1}
              isSelected={entry.teamId === selectedTeamId}
              onSelect={() => onSelectTeam(entry.teamId)}
            />
          ))}
        </Stack>
      </Box>
    </Box>
  )
}

function CurrentLeaderboardTableRow({
  entry,
  rank,
  isSelected,
  onSelect,
}: {
  entry: GameHistoryTeamLeaderboardEntry
  rank: number
  isSelected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const bestScore = getTeamBestScore(entry)
  const finalScore = getTeamFinalScore(entry)
  const penaltyTotal = getTeamPenaltyTotal(entry)

  return (
    <Box
      component="button"
      type="button"
      aria-pressed={isSelected}
      aria-controls="leaderboard-team-details"
      onClick={onSelect}
      sx={(theme) => ({
        width: '100%',
        minWidth: 0,
        border: 0,
        backgroundColor: isSelected
          ? alpha(theme.palette.primary.main, 0.19)
          : rank % 2 === 0
            ? alpha(theme.palette.primary.main, 0.065)
            : alpha(theme.palette.common.black, 0.16),
        boxShadow: isSelected ? `inset 3px 0 ${theme.palette.primary.main}` : 'none',
        color: 'inherit',
        cursor: 'pointer',
        textAlign: 'left',
        px: 1.25,
        py: 0.85,
        transition: 'background-color 0.15s ease',
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.15),
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: -2,
        },
      })}
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
        <RankBadge rank={rank} compact />

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
            {formatHistoryTeamName(t, entry.teamName, entry.teamSlotIndex)}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {entry.participantNames.length > 0
              ? entry.participantNames.join(', ')
              : t('gameHistory.noParticipants')}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
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
    </Box>
  )
}
