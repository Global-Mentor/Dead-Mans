import type { PaletteOptions } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import { huntPalette } from '../../shared/theme/hunt-palette.ts'

const panelSurface = `linear-gradient(180deg, ${alpha(huntPalette.leather, 0.98)} 0%, ${alpha(huntPalette.bark, 0.98)} 100%)`
const panelAccent = `linear-gradient(180deg, ${alpha(huntPalette.moss, 0.92)} 0%, ${alpha(huntPalette.bark, 0.98)} 100%)`
const panelAccentSoft = `linear-gradient(180deg, ${alpha(huntPalette.mossDeep, 0.88)} 0%, ${alpha(huntPalette.charcoal, 0.96)} 100%)`
const authCard = `radial-gradient(circle at top, ${alpha(huntPalette.brass, 0.14)} 0, transparent 55%), ${panelSurface}`
const appBackdrop = `radial-gradient(ellipse 120% 80% at 50% -10%, ${alpha(huntPalette.murk, 0.45)} 0%, transparent 55%), linear-gradient(180deg, ${huntPalette.charcoal} 0%, ${huntPalette.soot} 100%)`

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
    paper: huntPalette.leather,
  },
  text: {
    primary: huntPalette.parchment,
    secondary: huntPalette.parchmentMuted,
  },
  divider: alpha(huntPalette.brassMuted, 0.45),
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
    contrastText: huntPalette.parchment,
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
