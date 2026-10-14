import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { ParticipantNamesList } from '../../../shared/game-ui/index.ts'
import type { RegistrationPlayer } from '../../../shared/api/contracts/index.ts'
import type { AdminTeamTarget } from './AdminTeamPlayerDialog.tsx'

export type OrderedAdminTeamEntry = AdminTeamTarget

export function AdminRegistrationPlayerCard({
  player,
  compact = false,
  alignment = 'start',
  actions,
  metadata,
  footer,
  testId,
}: {
  player: RegistrationPlayer
  compact?: boolean
  alignment?: 'start' | 'center'
  metadata?: ReactNode
  footer?: ReactNode
  actions?: ReactNode
  testId?: string
}) {
  if (alignment === 'center') {
    return (
      <Box
        component="li"
        data-testid={testId}
        sx={(theme) => ({
          listStyle: 'none',
          display: 'grid',
          gridTemplateColumns: metadata
            ? 'minmax(44px,1fr) minmax(0,2fr) minmax(44px,1fr)'
            : 'minmax(0,1fr)',
          alignItems: 'center',
          columnGap: 0.5,
          minWidth: 0,
          py: 0.5,
          minHeight: metadata ? 44 : undefined,
          rowGap: footer ? 0.5 : 0,
          borderBottom: '1px solid ' + theme.palette.divider,
          '&:last-child': { borderBottom: 0 },
        })}
      >
        {actions ? (
          <Box sx={{ gridColumn: 1, gridRow: 1, justifySelf: 'start' }}>{actions}</Box>
        ) : null}
        <Box sx={{ minWidth: 0, gridColumn: metadata ? 2 : 1, gridRow: 1 }}>
          <ParticipantNamesList
            names={[player.displayName]}
            emptyLabel=""
            variant="body1"
            decorated
            dense
            alignment="center"
          />
        </Box>
        {metadata ? (
          <Box sx={{ gridColumn: 3, gridRow: 1, minWidth: 0, justifySelf: 'end' }}>{metadata}</Box>
        ) : null}
        {footer ? (
          <Box sx={{ gridColumn: '1 / -1', justifySelf: 'center', minWidth: 0 }}>{footer}</Box>
        ) : null}
      </Box>
    )
  }
  return (
    <Stack
      component="li"
      data-testid={testId}
      direction={{ xs: compact ? 'column' : 'row', sm: 'row' }}
      gap={1}
      alignItems={{ xs: compact ? 'stretch' : 'center', sm: 'center' }}
      justifyContent="space-between"
      sx={(theme) => ({
        listStyle: 'none',
        minWidth: 0,
        py: compact ? 0.6 : 0.75,
        px: compact ? 0 : 0.5,
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
        {metadata}
      </Stack>
      {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
    </Stack>
  )
}
