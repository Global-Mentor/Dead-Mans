import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameTeamQueueItem } from '../../../shared/api/contracts/index.ts'
import { TeamPresentation } from '../../../shared/game-ui/index.ts'
import { ItemCard, StatusBadge } from '../../../shared/ui/index.ts'
import { formatTeamNameWithFallback } from '../../game-registration/index.ts'

export function TeamQueueCard({
  team,
  isActive,
  currentUserId,
  tone,
}: {
  team: GameTeamQueueItem
  isActive: boolean
  currentUserId: string | null
  tone: 'default' | 'alternate'
}) {
  const { t, i18n } = useTranslation()
  const name = formatTeamNameWithFallback(team.teamName, t('gameBoard.teamQueueUnnamedTeam'))
  const own = team.participants.some((participant) => participant.userId === currentUserId)
  const score = team.finalScore
  const formattedScore = score === null ? null : score.toLocaleString(i18n.resolvedLanguage)
  return (
    <ItemCard
      component="article"
      aria-label={name}
      emphasis={own ? 'selected' : 'none'}
      tone={tone}
      frame={isActive || own ? 'corner' : 'standard'}
      sx={{ p: 1.25, width: '100%', minWidth: 0 }}
    >
      <TeamPresentation
        leading={
          <StatusBadge
            density="compact"
            variant="outlined"
            sx={{ flexShrink: 0 }}
            aria-label={t('gameBoard.teamQueueSlotLabel', { slot: team.teamSlotIndex })}
            label={team.teamSlotIndex.toLocaleString(i18n.resolvedLanguage)}
          />
        }
        status={
          isActive || team.isPlayed ? (
            <>
              {isActive ? (
                <Typography variant="caption" color="warning.main" fontWeight={600}>
                  {t('gameBoard.teamQueueActiveChip')}
                </Typography>
              ) : null}
              {team.isPlayed ? (
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color={
                    score === null || score === 0
                      ? 'text.secondary'
                      : score > 0
                        ? 'success.main'
                        : 'error.main'
                  }
                  aria-label={
                    formattedScore === null
                      ? t('gameBoard.teamQueueNoFinalScore')
                      : t('gameBoard.teamQueueFinalScoreLabel', { score: formattedScore })
                  }
                >
                  {formattedScore === null
                    ? '-'
                    : t('boardCard.cellPlayedPoints', { score: formattedScore })}
                </Typography>
              ) : null}
            </>
          ) : null
        }
        name={name}
        members={team.participants.map((participant) => ({
          id: participant.userId,
          name: participant.displayName,
        }))}
        emptyLabel={t('gameBoard.roundSummaryNoParticipants')}
      />
    </ItemCard>
  )
}
