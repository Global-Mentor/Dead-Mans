import type { Components, Theme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import { huntPalette } from '../../shared/theme/hunt-palette.ts'
import { huntPaperTexture, huntWornFrame } from '../../shared/theme/hunt-materials.ts'
import { appThemeGradients } from './palette.ts'
import { appThemeBorderRadius } from './theme-constants.ts'

const texturedActionSurface = {
  position: 'relative',
  isolation: 'isolate',
  backgroundImage: 'none',
  color: huntPalette.parchment,
  border: '1px solid transparent',
  ...huntWornFrame,
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    zIndex: -1,
    backgroundImage: huntPaperTexture,
    backgroundSize: '360px auto',
    backgroundPosition: 'center',
    filter: 'brightness(3) contrast(1.6)',
    mixBlendMode: 'luminosity',
    opacity: 0.8,
    pointerEvents: 'none',
  },
} as const

export const buttonOverrides: Components<Theme> = {
  MuiButton: {
    defaultProps: {
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        borderRadius: appThemeBorderRadius,
        minHeight: 44,
        paddingInline: 18,
        '&.Mui-disabled': {
          color: alpha(huntPalette.parchmentMuted, 0.82),
          borderColor: alpha(huntPalette.parchmentMuted, 0.16),
          backgroundColor: alpha(huntPalette.soot, 0.18),
          backgroundImage: 'none',
          borderImage: 'none',
          boxShadow: 'none',
          opacity: 1,
          '&::before': { display: 'none' },
        },
      },
      containedPrimary: {
        ...texturedActionSurface,
        backgroundColor: huntPalette.ochre,
        '&::before': {
          ...texturedActionSurface['&::before'],
          filter: 'brightness(1.7) contrast(1.4)',
          opacity: 0.4,
        },
        '&:hover': { backgroundColor: huntPalette.ochre, filter: 'brightness(1.12)' },
      },
      containedSuccess: {
        backgroundImage: 'none',
        color: huntPalette.soot,
        border: `1px solid ${alpha(huntPalette.fern, 0.65)}`,
      },
      containedError: {
        ...texturedActionSurface,
        backgroundColor: huntPalette.bloodDeep,
        '&::before': { ...texturedActionSurface['&::before'], opacity: 0.45 },
        '&:hover': { backgroundColor: huntPalette.bloodDeep, filter: 'brightness(1.12)' },
      },
      outlinedPrimary: {
        borderColor: alpha(huntPalette.parchment, 0.22),
        color: huntPalette.parchment,
        backgroundImage: appThemeGradients.panelSurface,
        backgroundSize: 'auto, 400px auto',
      },
      outlinedError: {
        borderColor: alpha(huntPalette.blood, 0.55),
        color: huntPalette.parchment,
      },
      textPrimary: {
        color: huntPalette.parchment,
      },
      textWarning: {
        color: huntPalette.amber,
      },
    },
  },
}
