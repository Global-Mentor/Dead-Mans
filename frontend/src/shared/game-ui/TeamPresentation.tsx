import { Stack } from '@mui/material'
import type { ReactNode } from 'react'
import { SectionDivider } from '../ui/index.ts'
import { TeamRoster, type TeamPresentationMember } from './TeamRoster.tsx'
import { TeamHeading } from './TeamHeading.tsx'

/** Read-only team identity; features supply roster state, metadata and actions. */
export function TeamPresentation({
  name,
  members,
  emptyLabel,
  leading,
  status,
  actions,
  density = 'standard',
}: {
  name: string
  members: readonly TeamPresentationMember[]
  emptyLabel: string
  leading?: ReactNode
  status?: ReactNode
  actions?: ReactNode
  density?: 'standard' | 'compact'
}) {
  return (
    <Stack
      data-testid="team-presentation"
      spacing={density === 'compact' ? 0.75 : 1.25}
      sx={{ width: '100%', minWidth: 0, containerType: 'inline-size' }}
    >
      <Stack data-testid="team-heading" spacing={1} sx={{ minWidth: 0 }}>
        <TeamHeading
          name={name}
          compact={density === 'compact'}
          leading={leading}
          status={
            status ? (
              <Stack
                data-testid="team-status"
                spacing={0.25}
                alignItems="flex-end"
                sx={{ minWidth: 0, textAlign: 'right', overflowWrap: 'anywhere' }}
              >
                {status}
              </Stack>
            ) : null
          }
        />
        <SectionDivider />
      </Stack>
      <TeamRoster members={members} emptyLabel={emptyLabel} density={density} />
      {actions ? (
        <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="center">
          {actions}
        </Stack>
      ) : null}
    </Stack>
  )
}
