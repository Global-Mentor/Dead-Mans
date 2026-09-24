import { Box, Stack } from '@mui/material'
import type { ReactNode } from 'react'
import { ItemCard } from '../../primitives/surfaces/ItemCard.tsx'

/** A readable catalogue record; actions flow below content before either can be squeezed. */
export function RecordRow({ children, actions }: { children: ReactNode; actions: ReactNode }) {
  return (
    <ItemCard
      component="article"
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 1.5,
        alignItems: 'flex-start',
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>{children}</Box>
      <Stack
        direction="row"
        useFlexGap
        spacing={1}
        sx={{ flexShrink: 0, flexWrap: 'wrap', maxWidth: '100%' }}
      >
        {actions}
      </Stack>
    </ItemCard>
  )
}
