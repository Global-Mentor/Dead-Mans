import type { Components, Theme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import { huntPalette } from '../../shared/theme/hunt-palette.ts'

export const inputOverrides: Components<Theme> = {
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
        minHeight: 44,
        '&:not(.Mui-error):not(.Mui-disabled) .MuiOutlinedInput-notchedOutline': {
          borderColor: alpha(huntPalette.parchment, 0.25),
        },
        '&:not(.Mui-error):not(.Mui-disabled):hover .MuiOutlinedInput-notchedOutline': {
          borderColor: alpha(huntPalette.brass, 0.55),
        },
        '&.Mui-focused:not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
          borderColor: huntPalette.brass,
        },
      },
    },
  },
}
