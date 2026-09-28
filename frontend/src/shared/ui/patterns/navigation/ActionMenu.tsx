import { Menu, MenuItem, styled } from '@mui/material'
import { uiTokens } from '../../../theme/tokens.ts'

/** Menu owns focus management, Escape and focus return; never used as a form select. */
export const ActionMenu = styled(Menu)({
  '& .MuiMenu-paper': { maxWidth: 'calc(100vw - 32px)' },
})
export const ActionMenuItem = styled(MenuItem)({
  minHeight: uiTokens.control.height.standard,
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
}) as typeof MenuItem
