import { alpha, type Theme } from '@mui/material/styles'

export const modifierDetailBlockSx = (theme: Theme) => ({
  minWidth: 0,
  p: 1.25,
  border: '1px solid',
  borderColor: alpha(theme.palette.text.secondary, 0.3),
  backgroundColor: alpha(theme.palette.common.black, 0.22),
  textAlign: 'left',
})
