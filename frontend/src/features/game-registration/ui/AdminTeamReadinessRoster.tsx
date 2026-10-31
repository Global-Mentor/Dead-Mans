import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { StatusBadge } from '../../../shared/ui/index.ts'

export function AdminTeamReadinessRoster({
  members,
  minimumRows,
}: {
  members: RegistrationTeam['members']
  minimumRows: number
}) {
  const { t } = useTranslation()
  return (
    <Stack
      component="ul"
      sx={{
        m: 0,
        p: 0,
        listStyle: 'none',
        display: 'grid',
        gap: 0.25,
        gridTemplateRows: `repeat(${minimumRows}, minmax(18px, auto))`,
      }}
    >
      {members.map(({ player, readyAtUtc }) => (
        <Stack
          component="li"
          key={player.userId}
          gap={0.5}
          alignItems="center"
          justifyContent="center"
          sx={{
            minWidth: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          }}
        >
          <Typography
            variant="caption"
            noWrap
            sx={{ gridColumn: 2, gridRow: 1, minWidth: 0, lineHeight: 1.25, textAlign: 'center' }}
          >
            {player.displayName}
          </Typography>
          <StatusBadge
            size="small"
            density="tight"
            textFlow="wrap"
            color={readyAtUtc ? 'success' : 'default'}
            variant={readyAtUtc ? 'filled' : 'outlined'}
            label={t(readyAtUtc ? 'gameApplication.playerReady' : 'gameApplication.playerNotReady')}
            sx={{ gridColumn: 1, gridRow: 1, justifySelf: 'start' }}
          />
        </Stack>
      ))}
      {members.length === 0 ? (
        <Typography component="li" variant="caption" color="text.secondary" textAlign="center">
          {t('gameApplication.adminPanel.emptyTeam')}
        </Typography>
      ) : null}
    </Stack>
  )
}
