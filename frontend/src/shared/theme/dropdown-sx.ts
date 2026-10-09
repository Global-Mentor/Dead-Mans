import { alpha, type Theme } from '@mui/material/styles'
import { cornerFrameSx } from './corner-frame-sx.ts'
import { getAppSurfaceSx } from './surface-sx.ts'
import { uiTokens } from './tokens.ts'

export function popoverPanelSx(theme: Theme) {
  return {
    ...getAppSurfaceSx(theme, 'panel'),
    ...cornerFrameSx(theme),
    boxShadow: theme.shadows[16],
    maxWidth: 'calc(100vw - 32px)',
  }
}

export function dropdownListSx(theme: Theme) {
  return { paddingTop: theme.spacing(1), paddingBottom: theme.spacing(1) }
}

export function dropdownItemSx(theme: Theme) {
  return {
    position: 'relative' as const,
    minHeight: uiTokens.navigation.menuItemHeight,
    '@media (pointer: coarse)': { minHeight: uiTokens.control.height.standard },
    padding: theme.spacing(0.25, 1.5),
    fontSize: uiTokens.navigation.fontSize,
    lineHeight: 1.5,
    whiteSpace: 'normal' as const,
    overflowWrap: 'anywhere' as const,
    color: theme.palette.text.primary,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    textDecoration: 'none',
    '&.Mui-selected, &[aria-selected="true"]': {
      color: theme.palette.text.primary,
      fontWeight: 700,
      backgroundColor: alpha(theme.palette.primary.main, 0.07),
    },
    '&:hover, &.Mui-selected:hover, &[aria-selected="true"]:hover, &.Mui-focused, &.Mui-focusVisible':
      {
        color: theme.palette.text.primary,
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
      },
    '&.Mui-focusVisible': {
      outline: '2px solid',
      outlineColor: theme.palette.primary.main,
      outlineOffset: -2,
    },
    '&.Mui-disabled, &[aria-disabled="true"]': {
      opacity: 1,
      color: alpha(theme.palette.text.primary, theme.palette.action.disabledOpacity),
    },
  }
}

export function dropdownSeparatorSx(theme: Theme) {
  return {
    '& + [role="option"]::before, & + [role="menuitem"]::before': {
      content: '""',
      position: 'absolute' as const,
      top: 0,
      left: theme.spacing(1.5),
      right: theme.spacing(1.5),
      height: '1px',
      backgroundColor: theme.palette.divider,
      pointerEvents: 'none' as const,
    },
  }
}

export function dropdownPaperSx(theme: Theme) {
  return {
    ...popoverPanelSx(theme),
    '&& .MuiMenu-list, && .MuiAutocomplete-listbox': dropdownListSx(theme),
    '&& .MuiMenuItem-root, && .MuiAutocomplete-option': {
      ...dropdownItemSx(theme),
      ...dropdownSeparatorSx(theme),
    },
  }
}
