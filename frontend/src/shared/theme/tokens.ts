import { huntPalette } from './hunt-palette.ts'

export const huntTypography = {
  display: 'var(--app-font-family)',
  displayWeight: 600,
  body: 'var(--app-font-family)',
} as const

export const uiTokens = {
  type: {
    metadata: '0.75rem',
    secondary: '0.875rem',
    body: '1rem',
    subheading: '1.125rem',
    section: '1.25rem',
    heading: '1.5rem',
    display: '2rem',
  },
  spacing: {
    section: 1.5,
    page: {
      xs: 1.5,
      sm: 2,
    },
  },
  control: {
    height: {
      compact: 36,
      standard: 44,
      large: 48,
    },
  },
  navigation: {
    fontSize: 14,
    menuItemHeight: 28,
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
