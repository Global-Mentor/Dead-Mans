import { alpha, type Theme } from '@mui/material/styles'
import { huntWornFrame } from '../../../theme/hunt-materials.ts'
import { huntPalette } from '../../../theme/hunt-palette.ts'
export function itemCardSx(theme: Theme, emphasis: 'none' | 'available' | 'selected') {
  return {
    p: 1.5,
    borderColor: emphasis === 'selected' ? alpha(huntPalette.amber, 0.65) : 'divider',
    backgroundColor: 'background.paper',
    backgroundImage: `linear-gradient(110deg, ${alpha(emphasis === 'selected' ? huntPalette.ember : theme.palette.primary.dark, emphasis === 'selected' ? 0.26 : emphasis === 'available' ? 0.1 : 0)}, transparent 70%), ${theme.custom.gradients.panelSurface}`,
    backgroundSize: 'auto, auto, 640px auto',
    ...(emphasis === 'selected' ? huntWornFrame : {}),
  }
}
