import type { Components, Theme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import { huntPalette } from '../../../theme/hunt-palette.ts'
import { appThemeBorderRadius } from '../../../theme/theme-constants.ts'

export const noticeTheme: Components<Theme> = {
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
}
