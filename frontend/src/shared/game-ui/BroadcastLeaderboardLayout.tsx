import { Box } from '@mui/material'
import type { ReactNode } from 'react'
import { useBroadcastContentFit } from './use-broadcast-content-fit.ts'

export function BroadcastLeaderboardLayout({ children }: { children: ReactNode }) {
  const { container, content, scale } = useBroadcastContentFit('top')
  return (
    <Box ref={container} sx={{ position: 'absolute', inset: 24 }}>
      <Box
        ref={content}
        sx={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: 'max(640px, min(1152px, 100%))',
          transformOrigin: 'top center',
          transform: `translateX(-50%) scale(${scale ?? 1})`,
          visibility: scale === null ? 'hidden' : 'visible',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
