import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { RoundBriefingDivider } from '../../../shared/game-ui/index.ts'
import { SelectionRow, StatusBadge } from '../../../shared/ui/index.ts'
import { formatGameTimeLabel } from '../model/game-history-view.ts'

type GameHistoryGameSummary = components['schemas']['GameHistoryGameSummaryDto']

export function GameSummaryButton({
  game,
  isSelected,
  tone,
  onClick,
}: {
  game: GameHistoryGameSummary
  isSelected: boolean
  tone: 'default' | 'alternate'
  onClick: () => void
}) {
  const { t, i18n } = useTranslation()

  return (
    <SelectionRow
      tone={tone}
      selectionAppearance="outline"
      type="button"
      selected={isSelected}
      onClick={onClick}
    >
      <Stack
        spacing={1}
        alignItems="center"
        sx={{ width: '100%', minWidth: 0, textAlign: 'center' }}
      >
        <Typography variant="body2" fontWeight={700} sx={{ minWidth: 0 }}>
          {game.gameTitle}
        </Typography>
        <RoundBriefingDivider />

        <Typography variant="caption" color="text.secondary">
          {formatGameTimeLabel(game, t, i18n.resolvedLanguage)}
        </Typography>

        <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent="center" useFlexGap>
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
