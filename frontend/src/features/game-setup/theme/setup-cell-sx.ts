import type { SxProps, Theme } from '@mui/material'
import { alpha } from '@mui/material/styles'

export const setupCellCardSx: SxProps<Theme> = (theme) => ({
  p: 1,
  aspectRatio: '5 / 6',
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  backgroundColor: alpha(theme.palette.common.black, 0.2),
  boxShadow: `inset 0 1px 0 ${alpha(theme.palette.primary.light, 0.06)}`,
})
