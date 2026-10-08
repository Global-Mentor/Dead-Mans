import { Stack } from '@mui/material'
import type { ReactNode } from 'react'
import { TeamHeading } from './TeamHeading.tsx'
import { RoundBriefingDivider } from './RoundBriefingPanel.tsx'
import { ParticipantNamesList } from './ParticipantNamesList.tsx'

/** Team content shared by informational cards and selectable rows. */
export function TeamIdentity({
  name,
  participants,
  emptyLabel,
  status,
  leading,
  compact = false,
  participantMarkers = false,
  alignment,
  divider = false,
  textFlow = 'wrap',
  minimumParticipantRows = 0,
}: {
  name: string
  participants: readonly string[]
  emptyLabel: string
  status?: ReactNode
  leading?: ReactNode
  compact?: boolean
  participantMarkers?: boolean
  alignment?: 'start' | 'center'
  divider?: boolean
  textFlow?: 'wrap' | 'singleLine'
  minimumParticipantRows?: number
}) {
  return (
    <Stack
      spacing={compact ? 0.5 : 1}
      sx={{ minWidth: 0, width: '100%', overflowWrap: 'anywhere' }}
    >
      <TeamHeading
        name={name}
        leading={leading}
        status={status}
        {...(alignment ? { alignment } : {})}
        compact={compact}
        textFlow={textFlow}
      />
      {divider ? <RoundBriefingDivider sx={{ my: 0.5 }} /> : null}
      <ParticipantNamesList
        names={participants}
        textFlow={textFlow}
        minimumRows={minimumParticipantRows}
        emptyLabel={emptyLabel}
        variant={compact ? 'caption' : 'body2'}
        dense={compact}
        leadingMarker={participantMarkers}
        {...(alignment ? { alignment } : {})}
      />
    </Stack>
  )
}
