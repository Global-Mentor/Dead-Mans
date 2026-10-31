import { Box, Typography } from '@mui/material'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { huntWornFrame } from '../theme/hunt-materials.ts'
import { getAppSurfaceSx } from '../theme/surface-sx.ts'

/** Shared team title with equal-width corners for centered identities. */
export function TeamHeading({
  name,
  leading,
  status,
  compact = false,
}: {
  name: string
  leading?: ReactNode
  status?: ReactNode
  compact?: boolean
}) {
  const headerRef = useRef<HTMLDivElement>(null)
  const leadingRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const header = headerRef.current
    const leadingBox = leadingRef.current
    const statusBox = statusRef.current
    if (!header || !leadingBox || !statusBox) return
    const syncCornerWidth = () => {
      const style = getComputedStyle(header)
      // Keep at least four em for the name when corner labels need to wrap.
      const availableCornerWidth = Math.max(
        0,
        (header.clientWidth - parseFloat(style.fontSize) * 4 - parseFloat(style.columnGap) * 2) / 2,
      )
      const maxCornerWidth = Math.min(availableCornerWidth, header.clientWidth * 0.2)
      leadingBox.style.maxWidth = availableCornerWidth + 'px'
      statusBox.style.maxWidth = maxCornerWidth + 'px'
      const width = Math.ceil(
        Math.max(leadingBox.getBoundingClientRect().width, statusBox.getBoundingClientRect().width),
      )
      header.style.setProperty('--team-header-corner-width', width + 'px')
    }
    syncCornerWidth()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncCornerWidth)
      return () => window.removeEventListener('resize', syncCornerWidth)
    }
    const observer = new ResizeObserver(syncCornerWidth)
    observer.observe(header)
    observer.observe(leadingBox)
    observer.observe(statusBox)
    return () => observer.disconnect()
  }, [])
  return (
    <Box
      ref={headerRef}
      data-testid="team-title"
      sx={{
        width: '100%',
        minWidth: 0,
        display: 'grid',
        gridTemplateColumns:
          'var(--team-header-corner-width, 0px) minmax(0, 1fr) var(--team-header-corner-width, 0px)',
        gap: !leading && !status ? 0 : 1,
        alignItems: 'center',
      }}
    >
      <Box ref={leadingRef} sx={{ minWidth: 0, width: 'max-content', justifySelf: 'start' }}>
        {leading}
      </Box>
      <Typography
        component="h3"
        variant={compact ? 'h6' : 'h4'}
        fontWeight={700}
        sx={(theme) => ({
          ...getAppSurfaceSx(theme, 'panel'),
          ...huntWornFrame,
          backgroundColor: 'transparent',
          backgroundImage: 'none',
          m: 0,
          minWidth: 0,
          textAlign: 'center',
          gridColumn: 2,
          justifySelf: 'center',
          color: 'primary.light',
          overflowWrap: 'anywhere',
          textWrap: 'balance',
          width: 'fit-content',
          maxWidth: '100%',
          boxSizing: 'border-box',
          px: compact ? 1.5 : 2.25,
          py: compact ? 0.375 : 0.625,
        })}
      >
        {name}
      </Typography>
      <Box
        ref={statusRef}
        sx={{
          minWidth: 0,
          gridColumn: 3,
          justifySelf: 'end',
          width: 'max-content',
          textAlign: 'right',
          overflowWrap: 'anywhere',
        }}
      >
        {status}
      </Box>
    </Box>
  )
}
