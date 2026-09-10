import '@mui/material/styles'

interface AppThemeGradients {
  panelSurface: string
  panelAccent: string
  panelAccentSoft: string
  authCard: string
  appBackdrop: string
}

declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      gradients: AppThemeGradients
    }
  }

  interface ThemeOptions {
    custom?: {
      gradients?: Partial<AppThemeGradients>
    }
  }
}
