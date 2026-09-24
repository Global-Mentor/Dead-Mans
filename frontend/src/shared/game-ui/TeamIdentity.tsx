import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { ParticipantNamesList } from './ParticipantNamesList.tsx'

/** Team content shared by informational cards and selectable rows. */
export function TeamIdentity({
  name,
  participants,
  emptyLabel,
  status,
  compact = false,
}: {
  name: string
  participants: readonly string[]
  emptyLabel: string
  status?: ReactNode
  compact?: boolean
}) {
  return (
    <Stack
      spacing={compact ? 0.5 : 1}
      sx={{ minWidth: 0, width: '100%', overflowWrap: 'anywhere' }}
    >
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        alignItems="baseline"
        justifyContent="space-between"
      >
        <Typography variant={compact ? 'body2' : 'subtitle1'} fontWeight={700} sx={{ minWidth: 0 }}>
          {name}
        </Typography>
        {status ? <Box sx={{ minWidth: 0 }}>{status}</Box> : null}
      </Stack>
      <ParticipantNamesList
        names={participants}
        emptyLabel={emptyLabel}
        variant={compact ? 'caption' : 'body2'}
        dense={compact}
      />
    </Stack>
  )
}
