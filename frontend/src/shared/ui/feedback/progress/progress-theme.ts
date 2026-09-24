import type { Components, Theme } from '@mui/material/styles'
import { huntPalette } from '../../../theme/hunt-palette.ts'

export const progressTheme: Components<Theme> = {
  MuiCircularProgress: {
    styleOverrides: {
      root: {
        color: huntPalette.brass,
      },
    },
  },
}
