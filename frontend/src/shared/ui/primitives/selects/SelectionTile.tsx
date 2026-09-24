import { Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { SurfaceButton } from '../buttons/SurfaceButton.tsx'

interface SelectionTileProps {
  selected: boolean
  onClick: () => void
  title: ReactNode
  description?: ReactNode
  disabled?: boolean
}
export function SelectionTile({ selected, title, description, ...props }: SelectionTileProps) {
  return (
    <SurfaceButton
      {...props}
      aria-pressed={selected}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        p: 1.25,
        border: 1,
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? 'action.selected' : 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Stack sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Stack>
    </SurfaceButton>
  )
}
