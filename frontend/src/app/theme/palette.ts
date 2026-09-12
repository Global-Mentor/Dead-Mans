import type { PaletteOptions } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import { huntPalette } from '../../shared/theme/hunt-palette.ts'
import { huntPaperTexture } from '../../shared/theme/hunt-materials.ts'

const panelSurface = `linear-gradient(125deg, ${alpha(huntPalette.charcoal, 0.3)}, ${alpha(huntPalette.soot, 0.58)}), ${huntPaperTexture}`
const panelAccent = `linear-gradient(135deg, ${alpha(huntPalette.leather, 0.15)}, ${alpha(huntPalette.charcoal, 0.4)}), ${huntPaperTexture}`
const panelAccentSoft = `linear-gradient(180deg, ${alpha(huntPalette.charcoal, 0.96)}, ${alpha(huntPalette.soot, 0.96)})`
const authCard = panelSurface
const appBackdrop = `linear-gradient(180deg, ${alpha(huntPalette.soot, 0.52)}, ${huntPalette.soot} 85%), ${huntPaperTexture}`

export const appThemeGradients = {
  panelSurface,
  panelAccent,
  panelAccentSoft,
  authCard,
  appBackdrop,
} as const

export const appPalette: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: huntPalette.brass,
    light: huntPalette.brassLight,
    dark: huntPalette.brassMuted,
    contrastText: huntPalette.soot,
  },
  secondary: {
    main: huntPalette.murk,
    light: huntPalette.moss,
    dark: huntPalette.mossDeep,
    contrastText: huntPalette.parchment,
  },
  background: {
    default: huntPalette.soot,
    paper: huntPalette.charcoal,
  },
  text: {
    primary: huntPalette.parchment,
    secondary: huntPalette.parchmentMuted,
  },
  divider: alpha(huntPalette.parchment, 0.16),
  error: {
    main: huntPalette.blood,
    contrastText: huntPalette.parchment,
  },
  warning: {
    main: huntPalette.amber,
    contrastText: huntPalette.soot,
  },
  success: {
    main: huntPalette.fern,
    contrastText: huntPalette.soot,
  },
  info: {
    main: huntPalette.murk,
    contrastText: huntPalette.parchment,
  },
  action: {
    hover: alpha(huntPalette.brass, 0.08),
    selected: alpha(huntPalette.moss, 0.35),
    disabled: alpha(huntPalette.parchmentMuted, 0.38),
    disabledBackground: alpha(huntPalette.soot, 0.35),
  },
}
