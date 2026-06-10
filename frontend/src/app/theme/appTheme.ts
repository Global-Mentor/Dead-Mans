import { alpha, createTheme } from '@mui/material/styles'
import { huntPalette } from '../../shared/theme/hunt-palette.ts'
import { huntTypography } from '../../shared/theme/tokens.ts'

const baseRadius = 4

const panelSurface = `linear-gradient(180deg, ${alpha(huntPalette.leather, 0.98)} 0%, ${alpha(huntPalette.bark, 0.98)} 100%)`
const panelAccent = `linear-gradient(180deg, ${alpha(huntPalette.moss, 0.92)} 0%, ${alpha(huntPalette.bark, 0.98)} 100%)`
const panelAccentSoft = `linear-gradient(180deg, ${alpha(huntPalette.mossDeep, 0.88)} 0%, ${alpha(huntPalette.charcoal, 0.96)} 100%)`
const authCard = `radial-gradient(circle at top, ${alpha(huntPalette.brass, 0.14)} 0, transparent 55%), ${panelSurface}`
const appBackdrop = `radial-gradient(ellipse 120% 80% at 50% -10%, ${alpha(huntPalette.murk, 0.45)} 0%, transparent 55%), linear-gradient(180deg, ${huntPalette.charcoal} 0%, ${huntPalette.soot} 100%)`
const filmGrain = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: huntPalette.brass,
      light: huntPalette.brassLight,
      dark: huntPalette.brassMuted,
      contrastText: huntPalette.soot,
    },
    secondary: {
      main: huntPalette.murk,
      light: huntPalette.moss,
      dark: huntPalette.mossDeep,
      contrastText: huntPalette.parchment,
    },
    background: {
      default: huntPalette.soot,
      paper: huntPalette.leather,
    },
    text: {
      primary: huntPalette.parchment,
      secondary: huntPalette.parchmentMuted,
    },
    divider: alpha(huntPalette.brassMuted, 0.45),
    error: {
      main: huntPalette.blood,
      contrastText: huntPalette.parchment,
    },
    warning: {
      main: huntPalette.amber,
      contrastText: huntPalette.soot,
    },
    success: {
      main: huntPalette.fern,
      contrastText: huntPalette.parchment,
    },
    info: {
      main: huntPalette.murk,
      contrastText: huntPalette.parchment,
    },
    action: {
      hover: alpha(huntPalette.brass, 0.08),
      selected: alpha(huntPalette.moss, 0.35),
      disabled: alpha(huntPalette.parchmentMuted, 0.38),
      disabledBackground: alpha(huntPalette.soot, 0.35),
    },
  },
  shape: {
    borderRadius: baseRadius,
  },
  typography: {
    fontFamily: huntTypography.body,
    h3: {
      fontFamily: huntTypography.display,
      fontWeight: 700,
      letterSpacing: '0.06em',
    },
    h5: {
      fontFamily: huntTypography.display,
      fontWeight: 700,
      letterSpacing: '0.05em',
    },
    h6: {
      fontFamily: huntTypography.display,
      fontWeight: 700,
      letterSpacing: '0.05em',
    },
    subtitle1: {
      fontFamily: huntTypography.display,
      fontWeight: 700,
      letterSpacing: '0.04em',
    },
    subtitle2: {
      fontFamily: huntTypography.display,
      fontWeight: 600,
      letterSpacing: '0.05em',
    },
    overline: {
      fontFamily: huntTypography.display,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
    },
    button: {
      fontFamily: huntTypography.display,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: baseRadius,
        },
        containedPrimary: {
          backgroundImage: `linear-gradient(180deg, ${huntPalette.brassLight} 0%, ${huntPalette.brass} 55%, ${huntPalette.brassMuted} 100%)`,
          color: huntPalette.soot,
          border: `1px solid ${alpha(huntPalette.brassLight, 0.65)}`,
          '&:hover': {
            backgroundImage: `linear-gradient(180deg, ${alpha(huntPalette.brassLight, 0.95)} 0%, ${huntPalette.brass} 100%)`,
          },
        },
        containedSuccess: {
          backgroundImage: `linear-gradient(180deg, ${alpha(huntPalette.fern, 0.95)} 0%, ${alpha(huntPalette.fern, 0.75)} 100%)`,
          border: `1px solid ${alpha(huntPalette.fern, 0.65)}`,
        },
        containedError: {
          backgroundImage: `linear-gradient(180deg, ${alpha(huntPalette.blood, 0.95)} 0%, ${alpha(huntPalette.blood, 0.8)} 100%)`,
          border: `1px solid ${alpha(huntPalette.blood, 0.55)}`,
        },
        outlinedPrimary: {
          borderColor: alpha(huntPalette.brass, 0.55),
          color: huntPalette.brassLight,
        },
        outlinedError: {
          borderColor: alpha(huntPalette.blood, 0.55),
          color: huntPalette.parchment,
        },
        textPrimary: {
          color: huntPalette.brassLight,
        },
        textWarning: {
          color: huntPalette.amber,
        },
      },
    },
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
          borderRadius: baseRadius,
          backgroundImage: panelSurface,
        },
        outlined: {
          borderColor: alpha(huntPalette.brassMuted, 0.5),
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        fullWidth: true,
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(huntPalette.soot, 0.35),
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(huntPalette.brassMuted, 0.45),
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(huntPalette.brass, 0.55),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: huntPalette.brass,
          },
        },
      },
    },
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
          borderRadius: baseRadius,
          border: `1px solid ${alpha(huntPalette.brassMuted, 0.45)}`,
          backgroundImage: panelAccent,
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
          borderRadius: baseRadius,
          border: `1px solid ${alpha(huntPalette.brassMuted, 0.45)}`,
          backgroundImage: panelAccent,
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
          borderRadius: baseRadius,
          border: `1px solid ${alpha(huntPalette.brassMuted, 0.45)}`,
          backgroundImage: panelAccent,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: panelAccent,
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
          borderRadius: baseRadius,
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
          borderRadius: baseRadius,
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
          color: huntPalette.parchment,
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
          borderColor: alpha(huntPalette.brassMuted, 0.35),
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
          minWidth: 320,
          minHeight: '100vh',
          backgroundColor: huntPalette.soot,
          backgroundImage: appBackdrop,
          backgroundAttachment: 'fixed',
          '&::after': {
            content: '""',
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.035,
            zIndex: 9999,
            backgroundImage: filmGrain,
            backgroundRepeat: 'repeat',
            backgroundSize: '180px',
          },
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
  },
})

appTheme.custom = {
  gradients: {
    panelSurface,
    panelAccent,
    panelAccentSoft,
    authCard,
    appBackdrop,
  },
}

declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      gradients: {
        panelSurface: string
        panelAccent: string
        panelAccentSoft: string
        authCard: string
        appBackdrop: string
      }
    }
  }

  interface ThemeOptions {
    custom?: {
      gradients?: {
        panelSurface?: string
        panelAccent?: string
        panelAccentSoft?: string
        authCard?: string
        appBackdrop?: string
      }
    }
  }
}
