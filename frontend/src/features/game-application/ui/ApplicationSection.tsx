import { Box, Stack, Typography } from '@mui/material'
import { useId, type ReactNode } from 'react'
import { SectionCard } from '../../../shared/ui/index.ts'

interface ApplicationSectionProps {
  title: string
  description?: string
  action?: ReactNode
  controls?: ReactNode
  children: ReactNode
}

export function ApplicationSection({
  title,
  description,
  action,
  controls,
  children,
}: ApplicationSectionProps) {
  const headingId = useId()

  return (
    <SectionCard
      component="section"
      aria-labelledby={headingId}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: { xs: 1.5, sm: 2 },
        minWidth: 0,
        containerType: 'inline-size',
      }}
    >
      <Stack component="header" sx={{ pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          useFlexGap
          sx={{ minHeight: 44 }}
        >
          <Typography id={headingId} component="h2" variant="h5" sx={{ fontSize: 28 }}>
            {title}
          </Typography>
          {action}
        </Stack>
      </Stack>
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
