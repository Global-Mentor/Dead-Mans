import { alpha } from '@mui/material/styles'
import { SectionDivider } from '../../../shared/ui/index.ts'

export function GameBoardOrnamentDivider() {
  return (
    <SectionDivider
      aria-hidden
      sx={(theme) => ({
        position: 'relative',
        m: 0,
        height: 8,
        border: 0,
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: 1,
          background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.light, 0.48)} 10%, ${alpha(theme.palette.primary.light, 0.48)} 90%, transparent)`,
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 8,
          height: 8,
          transform: 'translate(-50%, -50%) rotate(45deg)',
          border: `1px solid ${alpha(theme.palette.primary.light, 0.72)}`,
          backgroundColor: theme.palette.background.paper,
          boxShadow: `0 0 0 3px ${alpha(theme.palette.background.paper, 0.92)}`,
          pointerEvents: 'none',
        },
      })}
    />
  )
}
