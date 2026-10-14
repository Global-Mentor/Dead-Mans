import { keyframes } from '@emotion/react'
import { Box } from '@mui/material'

const appear = keyframes`
  from { opacity: 0; }
`

/** Dims the OBS scene beneath the browser source without sampling or blurring it. */
export function BroadcastBackdrop({ visible }: { visible: boolean }) {
  return (
    <Box
      aria-hidden
      data-testid="overlay-backdrop"
      sx={{
        position: 'absolute',
        inset: 0,
        bgcolor: 'common.black',
        opacity: visible ? 0.9 : 0,
        pointerEvents: 'none',
        animation: `${appear} 240ms ease-out`,
        transition: 'opacity 240ms ease-out',
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
          transition: 'none',
        },
      }}
    />
  )
}
