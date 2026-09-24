import { Box, type SxProps, type Theme } from '@mui/material'
import type { ReactNode } from 'react'
import { getAppSurfaceSx } from '../../../theme/surface-sx.ts'

interface NativeDisclosureProps {
  summary: ReactNode
  children: ReactNode
  open?: boolean
  onExpandedChange?: (expanded: boolean) => void
  pinned?: boolean
  surface?: 'plain' | 'panel'
  'data-testid'?: string
  sx?: SxProps<Theme>
}
/** Lightweight native disclosure for archive pickers and read-only detail lists. */
export function NativeDisclosure({
  summary,
  children,
  open,
  onExpandedChange,
  pinned = false,
  surface = 'plain',
  sx,
  ...props
}: NativeDisclosureProps) {
  return (
    <Box
      {...props}
      component="details"
      open={pinned || open}
      sx={[
        ...(surface === 'panel'
          ? [(theme: Theme) => ({ ...getAppSurfaceSx(theme, 'panel'), p: 1.25 })]
          : []),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        component="summary"
        onClick={
          onExpandedChange
            ? (event) => {
                event.preventDefault()
                onExpandedChange(!open)
              }
            : undefined
        }
        sx={{
          display: pinned ? 'none' : 'list-item',
          minHeight: 44,
          py: 1,
          cursor: 'pointer',
          overflowWrap: 'anywhere',
          color: 'text.secondary',
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        {summary}
      </Box>
      {children}
    </Box>
  )
}
