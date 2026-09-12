import { Box, Stack, Typography } from '@mui/material'
import { useId, type ReactNode } from 'react'

interface ApplicationSectionProps {
  title: string
  description?: string
  summary?: ReactNode
  controls?: ReactNode
  children: ReactNode
}

export function ApplicationSection({
  title,
  description,
  summary,
  controls,
  children,
}: ApplicationSectionProps) {
  const headingId = useId()

  return (
    <Box
      component="section"
      aria-labelledby={headingId}
      sx={{
        display: 'grid',
        gridTemplateRows: { xs: 'auto auto', md: 'subgrid' },
        gridRow: { md: 'span 2' },
        rowGap: 1.25,
        minWidth: 0,
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="baseline"
          justifyContent="space-between"
          flexWrap="wrap"
          useFlexGap
        >
          <Typography id={headingId} component="h2" variant="h5" sx={{ fontSize: 28 }}>
            {title}
          </Typography>
          {summary}
        </Stack>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
        {controls}
      </Stack>
      <Box sx={{ minWidth: 0, alignSelf: 'start' }}>{children}</Box>
    </Box>
  )
}
