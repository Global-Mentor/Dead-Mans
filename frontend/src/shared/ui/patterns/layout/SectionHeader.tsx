import { Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  textAlign?: 'left' | 'center'
  headingLevel?: 'h1' | 'h2' | 'h3'
  headingId?: string
}

export function SectionHeader({
  title,
  description,
  actions,
  textAlign = 'left',
  headingLevel = 'h2',
  headingId,
}: SectionHeaderProps) {
  return (
    <Stack component="header" sx={{ pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent={textAlign === 'center' ? 'center' : 'space-between'}
        flexWrap="wrap"
        useFlexGap
        sx={{ minHeight: 44 }}
      >
        <Typography id={headingId} component={headingLevel} variant="h5" sx={{ fontSize: 28 }}>
          {title}
        </Typography>
        {actions}
      </Stack>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      ) : null}
    </Stack>
  )
}
