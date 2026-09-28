import type { Components, Theme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import { huntPalette } from '../../../theme/hunt-palette.ts'

export const choiceTheme: Components<Theme> = {
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
}
