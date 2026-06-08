import type { Theme } from '@mui/material/styles'

export const uiTokens = {
  borderRadius: {
    sm: 1.5,
    md: 2,
    lg: 3,
  },
  spacing: {
    section: 2,
    page: {
      xs: 2,
      md: 3,
    },
  },
  brand: {
    twitch: '#6441A5',
    twitchHover: '#7c4fd9',
  },
} as const

export function getThemeGradients(theme: Theme) {
  return theme.custom.gradients
}

