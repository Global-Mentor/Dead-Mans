import { alpha, type Theme } from '@mui/material/styles'
import { huntPaperTexture, huntWornFrame } from './hunt-materials.ts'
import { huntPalette } from './hunt-palette.ts'
import { uiTokens } from './tokens.ts'

/** Semantic feedback shares subdued action materials and readable foregrounds. */
export function feedbackSurfaceSx(
  theme: Theme,
  severity: 'success' | 'error' | 'warning' | 'info',
) {
  const tint = {
    success: huntPalette.fernDeep,
    error: huntPalette.bloodDeep,
    warning: huntPalette.ochre,
    info: huntPalette.charcoal,
  }[severity]
  return {
    backgroundColor: tint,
    backgroundImage: `linear-gradient(110deg, ${alpha(tint, 0.72)}, ${alpha(huntPalette.soot, 0.76)}), ${huntPaperTexture}`,
    backgroundSize: `auto, ${uiTokens.texture.actionSize}`,
    backgroundPosition: 'center',
    border: `1px solid ${alpha(theme.palette[severity].main, 0.5)}`,
    color: theme.palette.text.primary,
    boxShadow: `inset 0 0 0 1px ${alpha(theme.palette[severity].main, 0.12)}`,
    ...huntWornFrame,
  }
}
