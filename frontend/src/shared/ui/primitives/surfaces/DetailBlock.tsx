import { Box, type BoxProps } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { mergeSx } from '../../../theme/merge-sx.ts'

/** A recessed text surface shared by descriptive and explanatory content. */
export function DetailBlock({ sx, ...props }: BoxProps) {
  return (
    <Box
      {...props}
      sx={mergeSx(
        (theme) => ({
          minWidth: 0,
          p: 1.25,
          border: '1px solid',
          borderColor: alpha(theme.palette.text.secondary, 0.3),
          backgroundColor: alpha(theme.palette.common.black, 0.22),
          textAlign: 'left',
        }),
        sx,
      )}
    />
  )
}
