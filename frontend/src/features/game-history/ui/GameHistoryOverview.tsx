import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import {
  ItemCard,
  Metric,
  NativeDisclosure,
  SelectionRow,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import {
  formatGameTimeLabel,
  getGameStatusColor,
  normalizeStatus,
} from '../model/game-history-view.ts'

type GameHistoryGameSummary = components['schemas']['GameHistoryGameSummaryDto']

export function CurrentGameLeaderboardSummary({
  title,
  status,
  playedTeamCount,
  playedRoundCount,
  activatedModifierCount,
  quizPoints,
  totalKills,
  totalTokens,
  penaltyTotal,
  teamFinalScoreTotal,
}: {
  title: string
  status: string
  playedTeamCount: number | null
  playedRoundCount: number | null
  activatedModifierCount: number | null
  quizPoints: number | null
  totalKills: number | null
  totalTokens: number | null
  penaltyTotal: number | null
  teamFinalScoreTotal: number | null
}) {
  const { t } = useTranslation()
  const formatCount = (value: number | null) =>
    value === null ? '-' : t('gameHistory.countValue', { count: value })
  const formatPoints = (value: number | null) =>
    value === null ? '-' : t('gameHistory.pointsValue', { points: value })

  return (
    <ItemCard
      component="section"
      aria-label={t('gameHistory.currentGameSummaryTitle')}
      data-testid="current-game-summary"
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={0.75}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 0.75 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>
            {t('gameHistory.currentGameSummaryTitle')}
          </Typography>
          <Typography component="p" variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
            {title}
          </Typography>
        </Box>
        <StatusBadge
          label={t(`gameHistory.status.${normalizeStatus(status)}`, {
            defaultValue: t('gameHistory.notAvailable'),
          })}
          color={getGameStatusColor(status)}
          variant="outlined"
          size="small"
          sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0 }}
        />
      </Stack>

      <NativeDisclosure summary={<>{t('gameHistory.aggregateStatistics')}</>}>
        <Box
          sx={{
            display: 'grid',
            gap: 0.6,
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(4, minmax(0, 1fr))',
            },
            '@media (min-width: 1200px)': {
              gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
            },
          }}
        >
          <Metric
            label={t('gameHistory.currentSummary.teams')}
            value={formatCount(playedTeamCount)}
          />
          <Metric
            label={t('gameHistory.currentSummary.rounds')}
            value={formatCount(playedRoundCount)}
          />
          <Metric
            label={t('gameHistory.currentSummary.score')}
            value={formatPoints(teamFinalScoreTotal)}
          />
          <Metric
            label={t('gameHistory.currentSummary.penalties')}
            value={formatPoints(penaltyTotal)}
          />
          <Metric label={t('gameHistory.currentSummary.quiz')} value={formatPoints(quizPoints)} />
          <Metric
            label={t('gameHistory.currentSummary.modifiers')}
            value={formatCount(activatedModifierCount)}
          />
          <Metric label={t('gameHistory.currentSummary.kills')} value={formatCount(totalKills)} />
          <Metric
            label={t('gameHistory.currentSummary.bounties')}
            value={formatCount(totalTokens)}
          />
        </Box>
      </NativeDisclosure>
    </ItemCard>
  )
}

export function GameSummaryButton({
  game,
  isSelected,
  onClick,
}: {
  game: GameHistoryGameSummary
  isSelected: boolean
  onClick: () => void
}) {
  const { t, i18n } = useTranslation()

  return (
    <SelectionRow type="button" selected={isSelected} onClick={onClick}>
      <Stack spacing={0.9}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 0, flex: 1 }}>
            {game.gameTitle}
          </Typography>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          {formatGameTimeLabel(game, t, i18n.resolvedLanguage)}
        </Typography>

        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <StatusBadge
            density="compact"
            variant="outlined"
            label={t('gameHistory.summary.roundCountShort', {
              count: game.mainGameRoundCount,
            })}
          />
          <StatusBadge
            density="compact"
            variant="outlined"
            label={t('gameHistory.summary.quizCountShort', {
              count: game.quizQuestionCount,
            })}
          />
          <StatusBadge
            density="compact"
            variant="outlined"
            label={t('gameHistory.summary.playerCountShort', {
              count: game.uniquePlayerCount,
            })}
          />
        </Stack>
      </Stack>
    </SelectionRow>
  )
}
