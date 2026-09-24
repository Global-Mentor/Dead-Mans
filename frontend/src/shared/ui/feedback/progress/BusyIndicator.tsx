import {
  CircularProgress,
  type CircularProgressProps,
  LinearProgress,
  type LinearProgressProps,
} from '@mui/material'
import { mergeSx } from '../../../theme/merge-sx.ts'

export function BusyIndicator({ sx, ...props }: CircularProgressProps) {
  return (
    <CircularProgress
      {...props}
      sx={mergeSx(
        { flexShrink: 0, '@media (prefers-reduced-motion: reduce)': { animationDuration: '3s' } },
        sx,
      )}
    />
  )
}
export function TaskProgress({ sx, ...props }: LinearProgressProps) {
  return <LinearProgress {...props} sx={mergeSx({ minWidth: 0, borderRadius: 0 }, sx)} />
}
