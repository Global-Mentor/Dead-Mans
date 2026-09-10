import { createTheme } from '@mui/material/styles'
import { appComponentOverrides } from './component-overrides.ts'
import { appPalette, appThemeGradients } from './palette.ts'
import { appThemeBorderRadius } from './theme-constants.ts'
import { appTypography } from './typography.ts'

export const appTheme = createTheme({
  palette: appPalette,
  shape: {
    borderRadius: appThemeBorderRadius,
  },
  typography: appTypography,
  components: appComponentOverrides,
  custom: {
    gradients: appThemeGradients,
  },
})
