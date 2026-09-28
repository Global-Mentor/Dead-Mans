import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { SectionCard } from '../../../shared/ui/index.ts'

interface TeamParticipant {
  userId: string
  displayName: string
}

interface GameBoardActiveTeamCardProps {
  title: string
  participants: readonly TeamParticipant[]
  ownTeam: boolean
  compact?: boolean
}

const participantOrnamentSx = {
  width: 12,
  height: 1,
  flexShrink: 0,
  bgcolor: 'primary.light',
  opacity: 0.55,
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 5,
    height: 5,
    border: '1px solid',
    borderColor: 'primary.light',
    transform: 'translate(-50%, -50%) rotate(45deg)',
  },
} as const

export function GameBoardActiveTeamCard({
  title,
  participants,
  ownTeam,
  compact = false,
}: GameBoardActiveTeamCardProps) {
  const { t } = useTranslation()

  return (
    <SectionCard
      component="section"
      aria-label={t('gameBoard.progress.currentTeam')}
      surface="inset"
      sx={{
        px: compact ? 1 : 1.25,
        py: compact ? 1 : 1.5,
        mb: compact ? 2 : 0,
        textAlign: 'center',
      }}
    >
      <Stack
        spacing={compact ? 0 : 1}
        alignItems="center"
        sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
      >
        <Stack
          spacing={compact ? 0 : 0.5}
          alignItems="center"
          sx={{ minWidth: 0, position: 'relative' }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            {t('gameBoard.progress.currentTeam')}
          </Typography>
          <Typography
            variant={compact ? 'subtitle1' : 'h6'}
            fontWeight={compact ? undefined : 700}
            sx={{ lineHeight: compact ? undefined : 1.2, overflowWrap: 'anywhere' }}
          >
            {title}
          </Typography>
          {ownTeam ? (
            <Box
              component="span"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '1px',
                height: '1px',
                overflow: 'hidden',
                clipPath: 'inset(50%)',
                whiteSpace: 'nowrap',
              }}
            >
              {t('gameBoard.progress.yourTeam')}
            </Box>
          ) : null}
        </Stack>
        {!compact &&
          (participants.length > 0 ? (
            <Stack
              component="ul"
              spacing={0.5}
              sx={{ width: '100%', m: 0, p: 0, listStyle: 'none' }}
            >
              {participants.map((participant) => (
                <Stack
                  component="li"
                  key={participant.userId}
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  justifyContent="center"
                  sx={{ minWidth: 0 }}
                >
                  <Box component="span" aria-hidden sx={participantOrnamentSx} />
                  <Typography
                    variant="body2"
                    sx={{ minWidth: 0, overflowWrap: 'anywhere', lineHeight: 1.4 }}
                  >
                    {participant.displayName}
                  </Typography>
                  <Box component="span" aria-hidden sx={participantOrnamentSx} />
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('gameBoard.roundSummaryNoParticipants')}
            </Typography>
          ))}
      </Stack>
    </SectionCard>
  )
}
