import { Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { ItemCard, OrnamentDivider, StatusBadge } from '../../shared/ui/index.ts'

export function GuideSection({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string
  number: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <ItemCard
      component="section"
      frame="corner"
      id={id}
      aria-labelledby={`${id}-title`}
      sx={{ scrollMarginTop: 160, minWidth: 0 }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <StatusBadge label={number} emphasis="strong" variant="outlined" aria-hidden />
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography component="h2" variant="h5" id={`${id}-title`}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Stack>
        </Stack>
        <OrnamentDivider />
        {children}
      </Stack>
    </ItemCard>
  )
}
