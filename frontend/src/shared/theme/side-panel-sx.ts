import { alpha, type Theme } from '@mui/material/styles'
import { uiTokens } from './tokens.ts'

// Both board wings share the board's charcoal / brass surface treatment.
export function sidePanelPaperSx(theme: Theme) {
  return {
    backgroundColor: theme.palette.background.default,
    backgroundImage: `linear-gradient(${alpha(theme.palette.background.default, 0.64)}, ${alpha(theme.palette.background.default, 0.64)}), ${theme.custom.gradients.panelSurface}`,
    backgroundSize: `auto, auto, ${uiTokens.texture.panelSize}`,
    borderColor: alpha(theme.palette.primary.main, 0.3),
    boxShadow: `0 0 48px ${alpha(theme.palette.common.black, 0.48)}`,
  }
}

export function sidePanelHeaderSx(theme: Theme) {
  return {
    position: 'relative',
    px: { xs: 2, sm: 2.5 },
    pt: 'max(16px, env(safe-area-inset-top))',
    pb: 2.5,
    backgroundImage: `linear-gradient(115deg, ${alpha(theme.palette.primary.main, 0.1)}, transparent 75%)`,
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: 16,
      right: 16,
      height: '1px',
      background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main, 0.42)} 20%, ${alpha(theme.palette.primary.main, 0.42)} 80%, transparent)`,
    },
  } as const
}

export const sidePanelTitleSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  minWidth: 0,
  overflowWrap: 'anywhere',
  color: 'primary.light',
  fontSize: { xs: 22, sm: 24 },
  fontWeight: 600,
  letterSpacing: '-0.02em',
  '&::before': {
    content: '""',
    width: 7,
    height: 7,
    flexShrink: 0,
    border: '1px solid',
    borderColor: 'primary.main',
    transform: 'rotate(45deg)',
  },
} as const

export function sidePanelCloseSx(theme: Theme) {
  return {
    width: 44,
    height: 44,
    flexShrink: 0,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
    borderRadius: '8px',
    color: theme.palette.text.secondary,
    backgroundColor: alpha(theme.palette.background.default, 0.24),
    '&:hover': {
      color: theme.palette.primary.light,
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
      borderColor: alpha(theme.palette.primary.main, 0.4),
    },
  }
}
