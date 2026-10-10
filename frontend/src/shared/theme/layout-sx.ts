import type { SxProps, Theme } from '@mui/material'

export const scrollRegionSx = {
  overflowY: 'auto',
  overscrollBehaviorY: 'contain',
  scrollbarGutter: 'stable both-edges',
  scrollbarWidth: 'thin',
} as const

export const pageShellSx: SxProps<Theme> = {
  maxWidth: 1100,
  mx: 'auto',
  width: '100%',
  minWidth: 0,
}

export const setupSplitLayoutSx: SxProps<Theme> = {
  flex: 1,
  display: 'flex',
  flexDirection: { xs: 'column', md: 'row' },
  gap: 2,
  alignItems: 'stretch',
  minHeight: 0,
}
