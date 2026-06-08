import type { SxProps, Theme } from '@mui/material'
import { getThemeGradients, uiTokens } from './tokens.ts'

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

export const gameSetupSidebarPaperSx: SxProps<Theme> = {
  width: { xs: '100%', md: 280 },
  flexShrink: 0,
  p: 2.5,
  borderRadius: (theme) => theme.shape.borderRadius,
  alignSelf: 'stretch',
  background: (theme) => getThemeGradients(theme).panelAccentSoft,
}

