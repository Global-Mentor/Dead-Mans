import { alpha } from '@mui/material/styles'
import type { ComponentProps } from 'react'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { SectionDivider } from './SectionDivider.tsx'

export function OrnamentDivider(props: ComponentProps<typeof SectionDivider>) {
  return (
    <SectionDivider
      {...props}
      aria-hidden
      sx={mergeSx(
        (theme) => ({
          position: 'relative',
          width: '100%',
          height: '1px',
          minHeight: '1px',
          overflow: 'visible',
          border: 0,
          m: 0,
          background: `linear-gradient(90deg, ${alpha(theme.palette.primary.light, 0.5)}, ${alpha(theme.palette.primary.light, 0.18)} 35%, ${alpha(theme.palette.primary.light, 0.18)} 65%, ${alpha(theme.palette.primary.light, 0.5)})`,
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 5,
            height: 5,
            transform: 'translate(-50%, -50%) rotate(45deg)',
            backgroundColor: theme.palette.primary.light,
            boxShadow: `0 0 0 3px ${theme.palette.background.paper}`,
            pointerEvents: 'none',
          },
        }),
        props.sx,
      )}
    />
  )
}
