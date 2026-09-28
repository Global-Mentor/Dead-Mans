import { Chip, type ChipProps } from '@mui/material'
import { mergeSx } from '../../../theme/merge-sx.ts'

interface StatusBadgeProps extends ChipProps {
  appearance?: 'standard' | 'plain'
  textFlow?: 'wrap' | 'singleLine'
  density?: 'standard' | 'compact'
}
/** A status or metadata label. Wrapping keeps translated and user-authored labels readable. */
export function StatusBadge({
  appearance = 'standard',
  textFlow = 'wrap',
  density = 'standard',
  sx,
  ...props
}: StatusBadgeProps) {
  return (
    <Chip
      {...props}
      sx={mergeSx(
        appearance === 'plain'
          ? { border: 0, bgcolor: 'transparent', color: 'text.secondary' }
          : undefined,
        textFlow === 'wrap'
          ? {
              maxWidth: '100%',
              height: 'auto',
              minHeight: 24,
              '& .MuiChip-label': { whiteSpace: 'normal', overflowWrap: 'anywhere', py: 0.5 },
            }
          : undefined,
        density === 'compact'
          ? { '& .MuiChip-label': { px: 1, fontSize: '0.73rem', fontWeight: 600 } }
          : undefined,
        sx,
      )}
    />
  )
}
