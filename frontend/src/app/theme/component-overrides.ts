import { choiceTheme } from '../../shared/ui/primitives/selects/choice-theme.ts'
import { menuTheme } from '../../shared/ui/patterns/navigation/menu-theme.ts'
import { helpTheme } from '../../shared/ui/feedback/help/help-theme.ts'
import { overlayTheme } from '../../shared/ui/feedback/dialogs/overlay-theme.ts'
import { statusTheme } from '../../shared/ui/primitives/status/status-theme.ts'
import { noticeTheme } from '../../shared/ui/feedback/messages/notice-theme.ts'
import { progressTheme } from '../../shared/ui/feedback/progress/progress-theme.ts'
import type { Components, Theme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import { huntPalette } from '../../shared/theme/hunt-palette.ts'
import { buttonOverrides } from '../../shared/ui/primitives/buttons/button-theme.ts'
import { inputOverrides } from '../../shared/ui/primitives/fields/field-theme.ts'
import { appThemeGradients } from '../../shared/theme/palette.ts'
import { appThemeBorderRadius } from '../../shared/theme/theme-constants.ts'

export const appComponentOverrides: Components<Theme> = {
  ...buttonOverrides,
  ...choiceTheme,
  ...menuTheme,
  ...helpTheme,
  ...overlayTheme,
  ...statusTheme,
  ...noticeTheme,
  ...progressTheme,
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
        borderRadius: appThemeBorderRadius,
      },
      outlined: {
        borderColor: alpha(huntPalette.brassMuted, 0.5),
      },
    },
  },
  ...inputOverrides,

  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: alpha(huntPalette.parchment, 0.16),
      },
    },
  },

  MuiCssBaseline: {
    styleOverrides: {
      body: {
        minWidth: 0,
        minHeight: '100vh',
        backgroundColor: huntPalette.soot,
        backgroundImage: appThemeGradients.appBackdrop,
        backgroundAttachment: 'fixed',
        backgroundSize: 'auto, 900px auto',
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
}
