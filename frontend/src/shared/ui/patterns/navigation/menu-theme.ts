import type { Components, Theme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import { huntPalette } from '../../../theme/hunt-palette.ts'
import { appThemeGradients } from '../../../theme/palette.ts'
import { appThemeBorderRadius } from '../../../theme/theme-constants.ts'
import { huntTypography } from '../../../theme/tokens.ts'

export const menuTheme: Components<Theme> = {
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: appThemeBorderRadius,
        border: `1px solid ${alpha(huntPalette.brassMuted, 0.45)}`,
        backgroundImage: appThemeGradients.panelAccent,
        backgroundColor: huntPalette.bark,
      },
      list: {
        py: 0.5,
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        fontFamily: huntTypography.body,
        '&.Mui-selected': {
          backgroundColor: alpha(huntPalette.moss, 0.45),
          '&:hover': {
            backgroundColor: alpha(huntPalette.moss, 0.55),
          },
        },
        '&:hover': {
          backgroundColor: alpha(huntPalette.mossDeep, 0.55),
        },
      },
    },
  },
  MuiPopover: {
    styleOverrides: {
      paper: {
        borderRadius: appThemeBorderRadius,
        border: `1px solid ${alpha(huntPalette.brassMuted, 0.45)}`,
        backgroundImage: appThemeGradients.panelAccent,
        backgroundColor: huntPalette.bark,
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        border: '1px solid transparent',
        '&.Mui-selected': {
          backgroundColor: alpha(huntPalette.moss, 0.45),
          borderColor: alpha(huntPalette.brass, 0.35),
          '&:hover': {
            backgroundColor: alpha(huntPalette.moss, 0.55),
          },
        },
      },
    },
  },
}
