import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import type { RegistrationPlayer } from '../../../shared/api/contracts/index.ts'
import type { AdminTeamTarget } from './AdminTeamPlayerDialog.tsx'

export type OrderedAdminTeamEntry = AdminTeamTarget

export function AdminRegistrationPlayerCard({
  player,
  actions,
  testId,
}: {
  player: RegistrationPlayer
  actions?: ReactNode
  testId?: string
}) {
  return (
    <Stack
      component="li"
      data-testid={testId}
      direction="row"
      gap={1}
      alignItems="center"
      justifyContent="space-between"
      sx={(theme) => ({
        listStyle: 'none',
        minWidth: 0,
        py: 0.75,
        px: 0.5,
        borderBottom: '1px solid ' + theme.palette.divider,
        '&:last-child': { borderBottom: 0 },
      })}
    >
      <Stack
        direction="row"
        gap={1}
        alignItems="center"
        justifyContent="space-between"
        sx={{ minWidth: 0, flex: 1 }}
      >
        <Typography variant="body2" fontWeight={700} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          {player.displayName}
        </Typography>
      </Stack>
      {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
    </Stack>
  )
}
