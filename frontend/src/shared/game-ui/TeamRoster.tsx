import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { CenteredIdentityRow } from './CenteredIdentityRow.tsx'
import { SectionCard } from '../ui/index.ts'

export interface TeamPresentationMember {
  id: string
  name: string
  detail?: ReactNode
  actions?: ReactNode
  pending?: boolean
  testId?: string
}

export function TeamRoster({
  members,
  emptyLabel,
  density = 'standard',
}: {
  members: readonly TeamPresentationMember[]
  emptyLabel: string
  density?: 'standard' | 'compact'
}) {
  const columns = Math.min(Math.max(members.length, 1), 3)
  const compact = density === 'compact'
  const hasMemberControls = members.some((member) => member.detail || member.actions)
  const minColumnWidth = hasMemberControls ? 280 : compact ? 120 : 144
  return (
    <Box sx={{ width: '100%', minWidth: 0, containerType: 'inline-size' }}>
      {members.length ? (
        <Box
          component="ul"
          sx={{
            m: 0,
            p: 0,
            listStyle: 'none',
            display: 'grid',
            gap: 0.75,
            gridTemplateColumns: 'minmax(0, 1fr)',
            [`@container (min-width: ${columns * minColumnWidth}px)`]: {
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            },
          }}
        >
          {members.map((member) => {
            const identity = (
              <Typography
                variant={compact ? 'body2' : 'body1'}
                fontWeight={600}
                color={member.pending ? 'text.secondary' : 'text.primary'}
                sx={{ width: '100%', textAlign: 'center', overflowWrap: 'anywhere' }}
              >
                {member.name}
              </Typography>
            )
            return (
              <SectionCard
                component="li"
                surface="inset"
                key={member.id}
                data-testid={member.testId}
                borderStyle={member.pending ? 'dashed' : 'solid'}
                sx={{
                  minWidth: 0,
                  px: compact ? 0.75 : 1,
                  py: compact ? 0.5 : 0.75,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                {member.detail || member.actions ? (
                  <CenteredIdentityRow
                    leading={member.detail}
                    trailing={member.actions}
                    trailingWidthLimit={0.4}
                  >
                    {identity}
                  </CenteredIdentityRow>
                ) : (
                  identity
                )}
              </SectionCard>
            )
          })}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {emptyLabel}
        </Typography>
      )}
    </Box>
  )
}
