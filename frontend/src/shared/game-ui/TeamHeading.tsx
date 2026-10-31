import { Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { CenteredIdentityRow } from './CenteredIdentityRow.tsx'
import { huntWornFrame } from '../theme/hunt-materials.ts'
import { getAppSurfaceSx } from '../theme/surface-sx.ts'

/** Shared team title with equal-width corners for centered identities. */
export function TeamHeading({
  name,
  leading,
  status,
  compact = false,
}: {
  name: string
  leading?: ReactNode
  status?: ReactNode
  compact?: boolean
}) {
  return (
    <CenteredIdentityRow leading={leading} trailing={status} testId="team-title">
      <Typography
        component="h3"
        variant={compact ? 'h6' : 'h4'}
        fontWeight={700}
        sx={(theme) => ({
          ...getAppSurfaceSx(theme, 'panel'),
          ...huntWornFrame,
          backgroundColor: 'transparent',
          backgroundImage: 'none',
          m: 0,
          minWidth: 0,
          textAlign: 'center',
          gridColumn: 2,
          justifySelf: 'center',
          color: 'primary.light',
          overflowWrap: 'anywhere',
          textWrap: 'balance',
          width: 'fit-content',
          maxWidth: '100%',
          boxSizing: 'border-box',
          px: compact ? 1.5 : 2.25,
          py: compact ? 0.375 : 0.625,
        })}
      >
        {name}
      </Typography>
    </CenteredIdentityRow>
  )
}
