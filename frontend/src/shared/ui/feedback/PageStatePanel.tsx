import { CircularProgress, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { huntBrassTitleSx } from '../../theme/surface-sx.ts'
import { SectionCard } from '../primitives/SectionCard.tsx'

interface PageStatePanelProps {
  title?: string
  message: string
  tone?: 'default' | 'error'
  showSpinner?: boolean
  actions?: ReactNode
}

export function PageStatePanel({
  title,
  message,
  tone = 'default',
  showSpinner = false,
  actions,
}: PageStatePanelProps) {
  return (
    <SectionCard sx={{ width: '100%', minWidth: 0 }} data-testid="page-state-panel">
      <Stack spacing={title ? 1 : 0} alignItems={showSpinner ? 'center' : 'stretch'}>
        {showSpinner ? <CircularProgress size={28} /> : null}
        {title ? (
          <Typography variant="h6" sx={huntBrassTitleSx}>
            {title}
          </Typography>
        ) : null}
        <Typography
          variant="body2"
          color={tone === 'error' ? 'error' : 'text.secondary'}
          textAlign={showSpinner ? 'center' : 'left'}
        >
          {message}
        </Typography>
        {actions ? (
          <Stack direction="row" sx={{ pt: 1 }}>
            {actions}
          </Stack>
        ) : null}
      </Stack>
    </SectionCard>
  )
}
