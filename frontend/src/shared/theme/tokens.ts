import type { Theme } from '@mui/material/styles'
import { huntPalette } from './hunt-palette.ts'

export const huntTypography = {
  display: '"Cinzel", "Source Serif 4", Georgia, serif',
  body: '"Source Serif 4", Georgia, "Times New Roman", serif',
} as const

export const uiTokens = {
  borderRadius: {
    sm: 1,
    md: 1.5,
    lg: 2,
  },
  spacing: {
    section: 2,
    page: {
      xs: 2,
      md: 3,
    },
  },
  brand: {
    twitch: huntPalette.twitch,
    twitchHover: huntPalette.twitchHover,
  },
} as const

export function getThemeGradients(theme: Theme) {
  return theme.custom.gradients
}
