import { alpha, type Theme } from '@mui/material/styles'

export const navigationButtonSx =
  (active = false) =>
  (theme: Theme) => ({
    position: 'relative' as const,
    minHeight: 44,
    px: 1.25,
    gap: 0.75,
    flexShrink: 0,
    borderRadius: '4px',
    fontFamily: theme.typography.fontFamily ?? 'inherit',
    fontSize: 16,
    fontWeight: active ? 700 : 500,
    whiteSpace: 'nowrap' as const,
    textDecoration: 'none',
    color: active ? theme.palette.text.primary : theme.palette.text.secondary,
    backgroundColor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
    '&::after': {
      content: '""',
      position: 'absolute' as const,
      bottom: 3,
      left: 12,
      right: 12,
      height: 2,
      backgroundColor: active ? theme.palette.primary.main : 'transparent',
    },
    '&:hover': {
      color: theme.palette.text.primary,
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
    },
    '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
  })
