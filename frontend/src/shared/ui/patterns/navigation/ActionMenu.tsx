import { Menu, MenuItem, styled } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { uiTokens } from '../../../theme/tokens.ts'
import { popoverPanelSx } from './popover-panel-sx.ts'

/** Menu owns focus management, Escape and focus return; never used as a form select. */
export const ActionMenu = styled(Menu, {
  shouldForwardProp: (prop) =>
    !['appearance', 'ownerState', 'theme', 'sx', 'as'].includes(String(prop)),
})<{ appearance?: 'standard' | 'index' | 'tree' }>(({ theme, appearance = 'standard' }) => ({
  '& .MuiMenu-paper': {
    ...(appearance !== 'standard' ? popoverPanelSx(theme) : { maxWidth: 'calc(100vw - 32px)' }),
  },
  ...(appearance !== 'standard'
    ? {
        '& .MuiMenu-list': {
          paddingTop: theme.spacing(1),
          paddingBottom: theme.spacing(1),
        },
        '& .MuiMenu-list > .MuiMenuItem-root': {
          minHeight: uiTokens.navigation.menuItemHeight,
          padding: theme.spacing(0.25, 1.5),
          fontSize: uiTokens.navigation.fontSize,
          lineHeight: 1.5,
          color: theme.palette.text.primary,
          backgroundColor: 'transparent',
          boxShadow: 'none',
          textDecoration: 'none',
          '&.Mui-selected': {
            color: theme.palette.text.primary,
            fontWeight: 700,
          },
          '&:hover, &.Mui-selected:hover': {
            color: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
          },
          '&.Mui-focusVisible': {
            color: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            outline: 'none',
          },
          '&.Mui-disabled': {
            opacity: 1,
            color: alpha(theme.palette.text.primary, theme.palette.action.disabledOpacity),
          },
          '@media (pointer: coarse)': {
            minHeight: uiTokens.control.height.standard,
          },
          ...(appearance === 'tree'
            ? {
                paddingLeft: theme.spacing(4.25),
                paddingRight: theme.spacing(2.5),
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: theme.spacing(2.5),
                  width: 1,
                  backgroundColor: theme.palette.divider,
                  pointerEvents: 'none',
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: '50%',
                  left: theme.spacing(2.5),
                  width: theme.spacing(1),
                  height: 1,
                  backgroundColor: theme.palette.divider,
                  pointerEvents: 'none',
                },
                '&:has(+ .MuiListSubheader-root)::before, &:last-child::before': {
                  bottom: '50%',
                },
              }
            : {
                '& + .MuiMenuItem-root::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: theme.spacing(1.5),
                  right: theme.spacing(1.5),
                  height: 1,
                  backgroundColor: theme.palette.divider,
                  pointerEvents: 'none',
                },
              }),
        },
      }
    : {}),
}))
export const ActionMenuItem = styled(MenuItem)({
  '&&': { minHeight: uiTokens.control.height.standard },
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
}) as typeof MenuItem
