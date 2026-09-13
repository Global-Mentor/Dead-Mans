import { huntPalette } from './hunt-palette.ts'

export const huntTypography = {
  display: 'var(--app-font-family)',
  displayWeight: 600,
  body: 'var(--app-font-family)',
} as const

export const uiTokens = {
  spacing: {
    section: 2,
    page: {
      xs: 2,
      md: 3,
    },
  },
  control: {
    height: {
      compact: 36,
      standard: 44,
      large: 48,
    },
  },
  texture: {
    panelSize: '640px auto',
    actionSize: '360px auto',
  },
  brand: {
    twitch: huntPalette.twitch,
    twitchHover: huntPalette.twitchHover,
  },
} as const
