import type { Components, Theme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import { huntPalette } from '../../shared/theme/hunt-palette.ts'
import { huntTypography } from '../../shared/theme/tokens.ts'
import { buttonOverrides } from './button-overrides.ts'
import { inputOverrides } from './input-overrides.ts'
import { appThemeGradients } from './palette.ts'
import { appThemeBorderRadius } from './theme-constants.ts'

export const appComponentOverrides: Components<Theme> = {
  ...buttonOverrides,
  MuiButtonBase: {
    styleOverrides: {
      root: {
        '&.Mui-focusVisible': {
          outline: '2px solid',
          outlineColor: huntPalette.brass,
          outlineOffset: 2,
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: appThemeBorderRadius,
        backgroundImage: appThemeGradients.panelSurface,
        backgroundSize: 'auto, 640px auto',
      },
      outlined: {
        borderColor: alpha(huntPalette.brassMuted, 0.5),
      },
    },
  },
  ...inputOverrides,
  MuiCheckbox: {
    styleOverrides: {
      root: {
        color: alpha(huntPalette.brassMuted, 0.85),
        '&.Mui-checked': {
          color: huntPalette.brass,
        },
      },
    },
  },
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
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: alpha(huntPalette.bark, 0.96),
        border: `1px solid ${alpha(huntPalette.brassMuted, 0.45)}`,
        color: huntPalette.parchment,
        fontFamily: huntTypography.body,
        fontSize: '0.8rem',
        boxShadow: `0 8px 20px ${alpha(huntPalette.soot, 0.45)}`,
      },
      arrow: {
        color: alpha(huntPalette.bark, 0.96),
        '&::before': {
          border: `1px solid ${alpha(huntPalette.brassMuted, 0.45)}`,
        },
      },
    },
  },
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
  MuiChip: {
    defaultProps: {
      size: 'small',
    },
    styleOverrides: {
      root: {
        borderRadius: appThemeBorderRadius,
        backgroundColor: alpha(huntPalette.soot, 0.35),
        border: `1px solid ${alpha(huntPalette.brassMuted, 0.4)}`,
        color: huntPalette.parchment,
      },
      colorSuccess: {
        backgroundColor: alpha(huntPalette.fern, 0.28),
        borderColor: alpha(huntPalette.fern, 0.55),
        color: huntPalette.parchment,
      },
      colorInfo: {
        backgroundColor: alpha(huntPalette.murk, 0.42),
        borderColor: alpha(huntPalette.murk, 0.65),
        color: huntPalette.parchment,
      },
      colorWarning: {
        backgroundColor: alpha(huntPalette.amber, 0.22),
        borderColor: alpha(huntPalette.amber, 0.5),
        color: huntPalette.parchment,
      },
      colorError: {
        backgroundColor: alpha(huntPalette.blood, 0.24),
        borderColor: alpha(huntPalette.blood, 0.5),
        color: huntPalette.parchment,
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: appThemeBorderRadius,
        border: `1px solid ${alpha(huntPalette.brassMuted, 0.35)}`,
      },
      standardError: {
        backgroundColor: alpha(huntPalette.blood, 0.22),
        color: huntPalette.parchment,
      },
      standardWarning: {
        backgroundColor: alpha(huntPalette.amber, 0.18),
        color: huntPalette.parchment,
      },
      standardSuccess: {
        backgroundColor: alpha(huntPalette.murk, 0.35),
        color: huntPalette.parchment,
      },
      standardInfo: {
        backgroundColor: alpha(huntPalette.mossDeep, 0.55),
        color: huntPalette.parchment,
      },
      filledError: {
        backgroundColor: alpha(huntPalette.blood, 0.82),
        color: huntPalette.parchment,
      },
      filledWarning: {
        backgroundColor: alpha(huntPalette.amber, 0.82),
        color: huntPalette.soot,
      },
      filledSuccess: {
        backgroundColor: alpha(huntPalette.fern, 0.82),
        color: huntPalette.soot,
      },
      filledInfo: {
        backgroundColor: alpha(huntPalette.murk, 0.88),
        color: huntPalette.parchment,
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
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: alpha(huntPalette.parchment, 0.16),
      },
    },
  },
  MuiCircularProgress: {
    styleOverrides: {
      root: {
        color: huntPalette.brass,
      },
    },
  },
  MuiSnackbar: {
    styleOverrides: {
      root: {
        '& .MuiPaper-root': {
          backgroundColor: 'transparent',
          boxShadow: 'none',
        },
      },
    },
  },
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        minWidth: 0,
        minHeight: '100vh',
        backgroundColor: huntPalette.soot,
        backgroundImage: appThemeGradients.appBackdrop,
        backgroundAttachment: 'fixed',
        backgroundSize: 'auto, 900px auto',
      },
      '#root': {
        minHeight: '100vh',
        position: 'relative',
        isolation: 'isolate',
      },
      a: {
        color: 'inherit',
        textDecoration: 'none',
      },
    },
  },
}
