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
  gradients: {
    panelAccent:
      'linear-gradient(180deg, rgba(144,202,249,0.12) 0%, rgba(20,24,41,0.98) 100%)',
    panelAccentSoft:
      'linear-gradient(180deg, rgba(144,202,249,0.08) 0%, rgba(20,24,41,0.98) 100%)',
    authCard:
      'radial-gradient(circle at top, rgba(144,202,249,0.12) 0, transparent 60%), #141829',
  },
  brand: {
    twitch: '#6441A5',
    twitchHover: '#7c4fd9',
  },
} as const

