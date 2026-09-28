import type { Components, Theme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import { huntPalette } from '../../../theme/hunt-palette.ts'
import { appThemeBorderRadius } from '../../../theme/theme-constants.ts'

export const statusTheme: Components<Theme> = {
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
}
