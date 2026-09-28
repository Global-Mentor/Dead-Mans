import { SectionHeader } from './SectionHeader.tsx'
import type { SxProps, Theme } from '@mui/material'
import { Box, Stack, Typography } from '@mui/material'
import { useId, type ReactNode } from 'react'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { SectionCard } from '../../primitives/surfaces/SectionCard.tsx'

interface FormSectionProps {
  title: string
  description?: string
  action?: ReactNode
  controls?: ReactNode
  children: ReactNode
  sx?: SxProps<Theme>
  'data-testid'?: string
}

export function FormSection({
  title,
  description,
  action,
  controls,
  children,
  sx,
  'data-testid': testId,
}: FormSectionProps) {
  const headingId = useId()

  return (
    <SectionCard
      component="section"
      aria-labelledby={headingId}
      data-testid={testId}
      sx={mergeSx(
        {
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: { xs: 1.5, sm: 2 },
          minWidth: 0,
          containerType: 'inline-size',
        },
        sx,
      )}
    >
      <SectionHeader headingId={headingId} title={title} actions={action} />
      <Stack spacing={1.5} sx={{ minWidth: 0 }}>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
        {controls}
        <Box sx={{ minWidth: 0 }}>{children}</Box>
      </Stack>
    </SectionCard>
  )
}
