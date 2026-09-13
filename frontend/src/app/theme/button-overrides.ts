import type { Components, Theme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import { huntPalette } from '../../shared/theme/hunt-palette.ts'
import { huntPaperTexture, huntWornFrame } from '../../shared/theme/hunt-materials.ts'
import { uiTokens } from '../../shared/theme/tokens.ts'
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
    backgroundSize: uiTokens.texture.actionSize,
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
        minHeight: uiTokens.control.height.standard,
        paddingInline: 18,
        transition:
          'background-color 120ms ease, border-color 120ms ease, color 120ms ease, filter 120ms ease',
        '&:active:not(.Mui-disabled)': {
          filter: 'brightness(0.96)',
        },
        '&.MuiButton-loading': {
          cursor: 'progress',
        },
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
      sizeSmall: {
        minHeight: uiTokens.control.height.compact,
        paddingInline: 14,
        fontSize: '0.875rem',
      },
      sizeLarge: {
        minHeight: uiTokens.control.height.large,
        paddingInline: 22,
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
        '&:hover': { filter: 'brightness(1.1)' },
      },
      containedError: {
        ...texturedActionSurface,
        backgroundColor: huntPalette.bloodDeep,
        '&::before': { ...texturedActionSurface['&::before'], opacity: 0.45 },
        '&:hover': { backgroundColor: huntPalette.bloodDeep, filter: 'brightness(1.12)' },
      },
      outlinedPrimary: {
        ...texturedActionSurface,
        backgroundColor: alpha(huntPalette.soot, 0.28),
        boxShadow: `inset 0 1px 0 ${alpha(huntPalette.parchment, 0.08)}`,
        '&::before': {
          ...texturedActionSurface['&::before'],
          opacity: 0.42,
        },
        '&:hover': {
          backgroundColor: alpha(huntPalette.mossDeep, 0.42),
        },
      },
      outlinedError: {
        borderColor: alpha(huntPalette.blood, 0.55),
        color: huntPalette.parchment,
        backgroundColor: alpha(huntPalette.bloodDeep, 0.1),
        '&:hover': {
          borderColor: huntPalette.blood,
          backgroundColor: alpha(huntPalette.bloodDeep, 0.24),
        },
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
