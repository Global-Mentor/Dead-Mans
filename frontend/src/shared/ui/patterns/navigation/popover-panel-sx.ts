import type { Theme } from '@mui/material/styles'
import { cornerFrameSx } from '../../../theme/corner-frame-sx.ts'
import { getAppSurfaceSx } from '../../../theme/surface-sx.ts'

export function popoverPanelSx(theme: Theme) {
  return {
    ...getAppSurfaceSx(theme, 'panel'),
    ...cornerFrameSx(theme),
    boxShadow: theme.shadows[16],
    maxWidth: 'calc(100vw - 32px)',
  }
}
