import type { SxProps, Theme } from '@mui/material'
import { uiTokens } from './tokens.ts'

export const pageShellSx: SxProps<Theme> = {
  maxWidth: 1100,
  mx: 'auto',
  p: uiTokens.spacing.page,
}

export const setupSplitLayoutSx: SxProps<Theme> = {
  flex: 1,
  display: 'flex',
  flexDirection: { xs: 'column', md: 'row' },
  gap: 2,
  alignItems: 'stretch',
  minHeight: 0,
}
