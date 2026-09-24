import type { Components, Theme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import { huntPalette } from '../../../theme/hunt-palette.ts'
import { appThemeGradients } from '../../../theme/palette.ts'
import { appThemeBorderRadius } from '../../../theme/theme-constants.ts'

export const overlayTheme: Components<Theme> = {
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: appThemeBorderRadius,
        border: `1px solid ${alpha(huntPalette.brassMuted, 0.45)}`,
        backgroundImage: appThemeGradients.panelAccent,
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundImage: appThemeGradients.panelAccent,
        borderLeft: `1px solid ${alpha(huntPalette.brassMuted, 0.45)}`,
      },
    },
  },
}
