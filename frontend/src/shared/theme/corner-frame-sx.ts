import { alpha, type Theme } from '@mui/material/styles'

/** Opposing fine corner rules shared by context panels and highlighted records. */
export function cornerFrameSx(theme: Theme, emphasis: 'standard' | 'strong' = 'standard') {
  const corner = alpha(theme.palette.primary.light, emphasis === 'strong' ? 0.9 : 0.65)
  const rule = `linear-gradient(${corner}, ${corner})`
  return {
    position: 'relative',
    borderColor: alpha(theme.palette.primary.light, emphasis === 'strong' ? 0.72 : 0.36),
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 5,
      backgroundImage: `${rule}, ${rule}, ${rule}, ${rule}`,
      backgroundSize: '12px 1px, 1px 12px, 12px 1px, 1px 12px',
      backgroundPosition: 'left top, left top, right bottom, right bottom',
      backgroundRepeat: 'no-repeat',
      pointerEvents: 'none',
    },
  } as const
}
