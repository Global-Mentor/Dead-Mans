import type { SxProps, Theme } from '@mui/material'
import { getThemeGradients } from '../../../shared/theme/tokens.ts'

export const gameSetupSidebarPaperSx: SxProps<Theme> = {
  width: { xs: '100%', md: 280 },
  flexShrink: 0,
  p: 2.5,
  borderRadius: (theme) => theme.shape.borderRadius,
  alignSelf: 'stretch',
  background: (theme) => getThemeGradients(theme).panelAccentSoft,
}
