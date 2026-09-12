import type { SxProps, Theme } from '@mui/material'
import type { SystemStyleObject } from '@mui/system'
import { alpha } from '@mui/material/styles'
import { huntTypography } from './tokens.ts'

export const huntBrassTitleSx: SxProps<Theme> = {
  fontFamily: huntTypography.display,
  fontWeight: huntTypography.displayWeight,
  letterSpacing: '-0.015em',
  color: 'text.primary',
}

export const huntOverlineSx: SxProps<Theme> = {
  fontFamily: huntTypography.body,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'text.secondary',
}

export const huntAuthScreenSx: SxProps<Theme> = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  px: 2,
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: (theme) =>
      `radial-gradient(circle at center, transparent 35%, ${alpha(theme.palette.common.black, 0.55)} 100%)`,
    pointerEvents: 'none',
  },
}

export function huntAuthCardSx(theme: Theme) {
  return {
    position: 'relative',
    zIndex: 1,
    p: 4,
    minWidth: { xs: '100%', sm: 320 },
    maxWidth: 520,
    textAlign: 'center',
    background: theme.custom.gradients.authCard,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.42)}`,
    boxShadow: `0 24px 60px ${alpha(theme.palette.common.black, 0.55)}, inset 0 1px 0 ${alpha(theme.palette.primary.light, 0.15)}`,
  }
}

export function huntPanelSx(theme: Theme): SystemStyleObject<Theme> {
  return {
    border: `1px solid ${alpha(theme.palette.text.primary, 0.18)}`,
    boxShadow: 'none',
    backgroundImage: theme.custom.gradients.panelSurface,
    backgroundSize: 'auto, 640px auto',
  }
}

export function huntInsetSurfaceSx(theme: Theme): SystemStyleObject<Theme> {
  return {
    backgroundColor: alpha(theme.palette.common.black, 0.22),
    border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
    backgroundImage: 'none',
    boxShadow: 'none',
  }
}
