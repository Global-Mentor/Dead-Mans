import { keyframes } from '@emotion/react'
import { Box, useMediaQuery } from '@mui/material'
import { useEffect, useState, type ReactNode } from 'react'

const appear = keyframes`
  from { opacity: 0; transform: translate(var(--overlay-enter-x), var(--overlay-enter-y)); }
  to { opacity: 1; transform: translate(0, 0); }
`
const disappear = keyframes`
  from { opacity: 1; transform: translate(0, 0); }
  to { opacity: 0; transform: translate(var(--overlay-exit-x), var(--overlay-exit-y)); }
`
const EXIT_MS = 180

/** Retain a departing scene only for its exit; invalid sessions unmount the entire tree. */
export function OverlayPresence({
  children,
  direction = 'up',
  delay = EXIT_MS,
}: {
  children: ReactNode | null
  direction?: 'up' | 'left'
  delay?: number
}) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [retained, setRetained] = useState(children)
  const present = children !== null
  if (present && children !== retained) setRetained(children)

  useEffect(() => {
    if (present) return
    const timer = setTimeout(() => setRetained(null), reducedMotion ? 0 : EXIT_MS)
    return () => clearTimeout(timer)
  }, [present, reducedMotion])

  if (!present && (reducedMotion || retained === null)) return null
  return (
    <Box
      data-overlay-presence={present ? 'enter' : 'exit'}
      sx={{
        '--overlay-enter-x': direction === 'left' ? '12px' : '0px',
        '--overlay-enter-y': direction === 'up' ? '12px' : '0px',
        '--overlay-exit-x': direction === 'left' ? '6px' : '0px',
        '--overlay-exit-y': direction === 'up' ? '-6px' : '0px',
        width: '100%',
        height: '100%',
        animation: present
          ? `${appear} 360ms ${delay}ms cubic-bezier(0.22, 1, 0.36, 1) backwards`
          : `${disappear} ${EXIT_MS}ms ease-in both`,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      {children ?? retained}
    </Box>
  )
}
