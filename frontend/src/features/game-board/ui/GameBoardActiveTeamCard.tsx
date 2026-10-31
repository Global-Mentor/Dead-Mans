import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ItemCard } from '../../../shared/ui/index.ts'
import { TeamPresentation } from '../../../shared/game-ui/index.ts'

export function GameBoardActiveTeamCard({
  title,
  participants,
  ownTeam,
  compact = false,
}: {
  title: string
  participants: readonly { userId: string; displayName: string }[]
  ownTeam: boolean
  compact?: boolean
}) {
  const { t } = useTranslation()
  return (
    <ItemCard
      component="section"
      aria-label={t('gameBoard.progress.currentTeam')}
      emphasis={ownTeam ? 'selected' : 'none'}
      sx={{ p: compact ? 1 : 1.25, mb: compact ? 2 : 0 }}
    >
      <Stack spacing={0.75}>
        <Typography variant="overline" color="text.secondary" textAlign="center">
          {t('gameBoard.progress.currentTeam')}
        </Typography>
        <TeamPresentation
          name={title}
          density={compact ? 'compact' : 'standard'}
          members={participants.map((player) => ({ id: player.userId, name: player.displayName }))}
          emptyLabel={t('gameBoard.roundSummaryNoParticipants')}
        />
      </Stack>
    </ItemCard>
  )
}
