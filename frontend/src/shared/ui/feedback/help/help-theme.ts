import type { Components, Theme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import { huntPalette } from '../../../theme/hunt-palette.ts'
import { huntTypography } from '../../../theme/tokens.ts'

export const helpTheme: Components<Theme> = {
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
}
