import { Menu, MenuItem, styled } from '@mui/material'
import { uiTokens } from '../../../theme/tokens.ts'
import {
  dropdownItemSx,
  dropdownListSx,
  dropdownSeparatorSx,
  popoverPanelSx,
} from '../../../theme/dropdown-sx.ts'

/** Menu owns focus management, Escape and focus return; never used as a form select. */
export const ActionMenu = styled(Menu, {
  shouldForwardProp: (prop) =>
    !['appearance', 'ownerState', 'theme', 'sx', 'as'].includes(String(prop)),
})<{ appearance?: 'index' | 'tree' }>(({ theme, appearance = 'index' }) => ({
  '& .MuiMenu-paper': {
    ...popoverPanelSx(theme),
  },
  '& .MuiMenu-list': dropdownListSx(theme),
  '& .MuiMenu-list > .MuiMenuItem-root': {
    ...dropdownItemSx(theme),
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
      : dropdownSeparatorSx(theme)),
  },
}))

export const ActionMenuItem = styled(MenuItem)({
  '&&': { minHeight: uiTokens.control.height.standard },
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
}) as typeof MenuItem
