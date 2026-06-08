import { alpha, createTheme } from '@mui/material/styles'
import { uiTokens } from '../../shared/theme/tokens.ts'

const appThemePalette = {
  backgroundDefault: '#0b1020',
  backgroundPaper: '#141829',
  primaryMain: '#90caf9',
}

const baseRadius = 12

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: appThemePalette.primaryMain,
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: appThemePalette.backgroundDefault,
      paper: appThemePalette.backgroundPaper,
    },
  },
  shape: {
    borderRadius: baseRadius,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
    subtitle1: {
      fontWeight: 700,
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
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outline: '2px solid',
            outlineColor: appThemePalette.primaryMain,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        fullWidth: true,
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: baseRadius,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: baseRadius,
        },
      },
    },
    MuiChip: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: baseRadius,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          minWidth: 320,
          minHeight: '100vh',
          backgroundColor: appThemePalette.backgroundDefault,
        },
        '#root': {
          minHeight: '100vh',
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
    panelAccent: `linear-gradient(180deg, ${alpha(appThemePalette.primaryMain, 0.12)} 0%, ${alpha(appThemePalette.backgroundPaper, 0.98)} 100%)`,
    panelAccentSoft: `linear-gradient(180deg, ${alpha(appThemePalette.primaryMain, 0.08)} 0%, ${alpha(appThemePalette.backgroundPaper, 0.98)} 100%)`,
    authCard: `radial-gradient(circle at top, ${alpha(appThemePalette.primaryMain, 0.12)} 0, transparent 60%), ${appThemePalette.backgroundPaper}`,
  },
}

export { uiTokens }

declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      gradients: {
        panelAccent: string
        panelAccentSoft: string
        authCard: string
      }
    }
  }

  interface ThemeOptions {
    custom?: {
      gradients?: {
        panelAccent?: string
        panelAccentSoft?: string
        authCard?: string
      }
    }
  }
}
