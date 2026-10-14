import { CircularProgress, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { huntBrassTitleSx } from '../../theme/surface-sx.ts'
import { SectionCard } from '../primitives/surfaces/SectionCard.tsx'
import { PageShell } from '../patterns/layout/PageShell.tsx'

interface PageStatePanelProps {
  variant?: 'section' | 'page'
  title?: string
  headingLevel?: 'h1' | 'h2' | 'h3' | 'h6'
  message: string
  tone?: 'default' | 'error'
  showSpinner?: boolean
  actions?: ReactNode
  children?: ReactNode
}

export function PageStatePanel({
  variant = 'section',
  title,
  headingLevel,
  message,
  tone = 'default',
  showSpinner = false,
  actions,
  children,
}: PageStatePanelProps) {
  const level = headingLevel ?? (variant === 'page' ? 'h1' : 'h6')
  const panel = (
    <SectionCard sx={{ width: '100%', minWidth: 0 }} data-testid="page-state-panel">
      <Stack spacing={1}>
        {title ? (
          <Typography
            component={level}
            variant={level === 'h1' ? 'h3' : 'h6'}
            sx={huntBrassTitleSx}
          >
            {title}
          </Typography>
        ) : null}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          role={tone === 'error' ? 'alert' : 'status'}
        >
          {showSpinner ? <CircularProgress size={20} /> : null}
          <Typography variant="body2" color={tone === 'error' ? 'error' : 'text.secondary'}>
            {message}
          </Typography>
        </Stack>
        {actions ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 1 }}>
            {actions}
          </Stack>
        ) : null}
        {children}
      </Stack>
    </SectionCard>
  )
  return variant === 'page' ? <PageShell variant="state">{panel}</PageShell> : panel
}
