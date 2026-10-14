import { alpha, type Theme } from '@mui/material/styles'
import { uiTokens } from './tokens.ts'
import { huntWornFrame } from './hunt-materials.ts'

// Reuse the application page's paper, straight dividers and worn controls.
export function sidePanelPaperSx(theme: Theme) {
  return {
    backgroundColor: theme.palette.background.paper,
    backgroundImage: theme.custom.gradients.panelSurface,
    backgroundSize: `auto, ${uiTokens.texture.panelSize}`,
    borderColor: alpha(theme.palette.primary.main, 0.3),
    boxShadow: `0 0 48px ${alpha(theme.palette.common.black, 0.48)}`,
  }
}

export function sidePanelHeaderSx(theme: Theme) {
  return {
    position: 'relative',
    px: 1.5,
    pt: 'max(12px, env(safe-area-inset-top))',
    pb: 1.5,
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: 16,
      right: 16,
      height: '1px',
      backgroundColor: theme.palette.divider,
    },
  } as const
}

export const sidePanelTitleSx = {
  minWidth: 0,
  overflowWrap: 'anywhere',
  color: 'text.primary',
  fontSize: uiTokens.type.heading,
  fontWeight: 600,
  lineHeight: 1.25,
} as const

export function sidePanelCloseSx(theme: Theme) {
  return {
    width: 44,
    height: 44,
    flexShrink: 0,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
    ...huntWornFrame,
    borderImageOutset: 0,
    borderRadius: 0,
    color: theme.palette.text.secondary,
    backgroundColor: alpha(theme.palette.background.default, 0.24),
    '&:hover': {
      color: theme.palette.primary.light,
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
      borderColor: alpha(theme.palette.primary.main, 0.4),
    },
  }
}
