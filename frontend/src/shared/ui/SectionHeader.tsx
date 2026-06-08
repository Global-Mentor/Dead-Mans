import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

export function SectionHeader({ title, description, actions }: SectionHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
    >
      <Box>
        <Typography variant="subtitle1">{title}</Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {actions ? <Box>{actions}</Box> : null}
    </Stack>
  )
}
