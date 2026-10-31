import { Box } from '@mui/material'
import { useLayoutEffect, useRef, type ReactNode } from 'react'

/** Equal side columns keep the identity centered independently of its controls. */
export function CenteredIdentityRow({
  leading,
  trailing,
  children,
  trailingWidthLimit = 0.2,
  testId,
}: {
  leading?: ReactNode
  trailing?: ReactNode
  children: ReactNode
  trailingWidthLimit?: number
  testId?: string
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const leadingRef = useRef<HTMLDivElement>(null)
  const trailingRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const row = rowRef.current
    const leadingBox = leadingRef.current
    const trailingBox = trailingRef.current
    if (!row || !leadingBox || !trailingBox) return
    const syncWidth = () => {
      const style = getComputedStyle(row)
      const available = Math.max(
        0,
        (row.clientWidth - parseFloat(style.fontSize) * 4 - parseFloat(style.columnGap) * 2) / 2,
      )
      leadingBox.style.maxWidth = available + 'px'
      trailingBox.style.maxWidth = Math.min(available, row.clientWidth * trailingWidthLimit) + 'px'
      const width = Math.ceil(
        Math.max(
          leadingBox.getBoundingClientRect().width,
          trailingBox.getBoundingClientRect().width,
        ),
      )
      row.style.setProperty('--identity-side-width', width + 'px')
    }
    syncWidth()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncWidth)
      return () => window.removeEventListener('resize', syncWidth)
    }
    const observer = new ResizeObserver(syncWidth)
    observer.observe(row)
    observer.observe(leadingBox)
    observer.observe(trailingBox)
    return () => observer.disconnect()
  }, [trailingWidthLimit])
  return (
    <Box
      ref={rowRef}
      data-testid={testId}
      sx={{
        width: '100%',
        minWidth: 0,
        display: 'grid',
        gridTemplateColumns:
          'var(--identity-side-width, 0px) minmax(0, 1fr) var(--identity-side-width, 0px)',
        gap: !leading && !trailing ? 0 : 1,
        alignItems: 'center',
      }}
    >
      <Box
        ref={leadingRef}
        sx={{
          minWidth: 0,
          width: 'max-content',
          justifySelf: 'start',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {leading}
      </Box>
      {children}
      <Box
        ref={trailingRef}
        sx={{
          minWidth: 0,
          gridColumn: 3,
          justifySelf: 'end',
          width: 'max-content',
          textAlign: 'right',
          overflowWrap: 'anywhere',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {trailing}
      </Box>
    </Box>
  )
}
