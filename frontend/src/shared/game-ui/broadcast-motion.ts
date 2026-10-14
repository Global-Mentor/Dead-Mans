import { keyframes } from '@emotion/react'

const reveal = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`
const update = keyframes`
  from { opacity: 0.35; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
`

export const broadcastRevealSx = {
  animation: `${reveal} 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
} as const

export const broadcastUpdateSx = {
  animation: `${update} 240ms ease-out backwards`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
} as const
