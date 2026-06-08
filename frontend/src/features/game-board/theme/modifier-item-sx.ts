import type { SxProps, Theme } from '@mui/material'
import { alpha } from '@mui/material/styles'

export const huntModifierItemSx: SxProps<Theme> = (theme) => ({
  border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
  borderRadius: theme.shape.borderRadius,
  p: 1.25,
  backgroundColor: alpha(theme.palette.common.black, 0.16),
  boxShadow: `inset 0 1px 0 ${alpha(theme.palette.primary.light, 0.06)}`,
})
