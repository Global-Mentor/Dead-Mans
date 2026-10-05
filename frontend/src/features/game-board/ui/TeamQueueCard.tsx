import { Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameTeamQueueItem } from '../../../shared/api/contracts/index.ts'
import { TeamIdentity } from '../../../shared/game-ui/index.ts'
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
      <TeamIdentity
        compact
        participantMarkers
        alignment="center"
        divider
        leading={
          <StatusBadge
            density="compact"
            variant="outlined"
            label={team.teamSlotIndex.toLocaleString(i18n.resolvedLanguage)}
            aria-label={t('gameBoard.teamQueueSlotLabel', { slot: team.teamSlotIndex })}
          />
        }
        name={name}
        participants={team.participants.map((participant) => participant.displayName)}
        emptyLabel={t('gameBoard.roundSummaryNoParticipants')}
        status={
          isActive || team.isPlayed || own ? (
            <Stack gap={0.5} alignItems="flex-end" sx={{ minWidth: 0 }}>
              {isActive ? (
                <StatusBadge
                  density="tight"
                  variant="outlined"
                  color="warning"
                  label={t('gameBoard.teamQueueActiveChip')}
                />
              ) : null}
              {team.isPlayed ? (
                <StatusBadge
                  density="tight"
                  variant="outlined"
                  color={
                    score === null || score === 0 ? 'default' : score > 0 ? 'success' : 'error'
                  }
                  aria-label={
                    formattedScore === null
                      ? t('gameBoard.teamQueueNoFinalScore')
                      : t('gameBoard.teamQueueFinalScoreLabel', { score: formattedScore })
                  }
                  label={
                    formattedScore === null
                      ? '-'
                      : t('gameBoard.cellPlayedPoints', { score: formattedScore })
                  }
                />
              ) : null}
              {own ? (
                <StatusBadge
                  density="tight"
                  variant="outlined"
                  label={t('gameBoard.progress.yourTeam')}
                />
              ) : null}
            </Stack>
          ) : null
        }
      />
    </ItemCard>
  )
}
