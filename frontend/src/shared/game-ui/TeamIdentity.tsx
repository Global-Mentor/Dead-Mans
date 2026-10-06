import { Box, Stack, Typography } from '@mui/material'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { RoundBriefingDivider } from './RoundBriefingPanel.tsx'
import { ParticipantNamesList } from './ParticipantNamesList.tsx'

/** Team content shared by informational cards and selectable rows. */
export function TeamIdentity({
  name,
  participants,
  emptyLabel,
  status,
  leading,
  compact = false,
  participantMarkers = false,
  alignment,
  divider = false,
}: {
  name: string
  participants: readonly string[]
  emptyLabel: string
  status?: ReactNode
  leading?: ReactNode
  compact?: boolean
  participantMarkers?: boolean
  alignment?: 'start' | 'center'
  divider?: boolean
}) {
  const headerRef = useRef<HTMLDivElement>(null)
  const leadingRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (alignment !== 'center') return
    const header = headerRef.current
    const leadingBox = leadingRef.current
    const statusBox = statusRef.current
    if (!header || !leadingBox || !statusBox) return
    const syncCornerWidth = () => {
      const style = getComputedStyle(header)
      // Keep at least four em for the name when corner labels need to wrap.
      const maxCornerWidth = Math.max(
        0,
        (header.clientWidth - parseFloat(style.fontSize) * 4 - parseFloat(style.columnGap) * 2) / 2,
      )
      leadingBox.style.maxWidth = maxCornerWidth + 'px'
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
  }, [alignment])
  return (
    <Stack
      spacing={compact ? 0.5 : 1}
      sx={{ minWidth: 0, width: '100%', overflowWrap: 'anywhere' }}
    >
      <Box
        ref={headerRef}
        sx={{
          display: alignment === 'center' ? 'grid' : 'flex',
          ...(alignment === 'center'
            ? {
                gridTemplateColumns:
                  'var(--team-header-corner-width, 0px) minmax(0, 1fr) var(--team-header-corner-width, 0px)',
              }
            : { flexWrap: 'wrap', justifyContent: 'space-between' }),
          gap: 1,
          alignItems: alignment === 'center' ? 'start' : 'baseline',
        }}
      >
        {leading || alignment === 'center' ? (
          <Box
            ref={leadingRef}
            sx={{
              minWidth: 0,
              width: alignment === 'center' ? 'max-content' : undefined,
              justifySelf: 'start',
            }}
          >
            {leading}
          </Box>
        ) : null}
        <Typography
          variant={compact ? 'body2' : 'subtitle1'}
          fontWeight={700}
          sx={{
            minWidth: 0,
            textAlign: alignment,
            ...(alignment === 'center' ? { gridColumn: 2 } : {}),
          }}
        >
          {name}
        </Typography>
        {status || alignment === 'center' ? (
          <Box
            ref={statusRef}
            sx={{
              minWidth: 0,
              ...(alignment === 'center'
                ? { gridColumn: 3, justifySelf: 'end', width: 'max-content' }
                : {}),
            }}
          >
            {status}
          </Box>
        ) : null}
      </Box>
      {divider ? <RoundBriefingDivider sx={{ my: 0.5 }} /> : null}
      <ParticipantNamesList
        names={participants}
        emptyLabel={emptyLabel}
        variant={compact ? 'caption' : 'body2'}
        dense={compact}
        leadingMarker={participantMarkers}
        {...(alignment ? { alignment } : {})}
      />
    </Stack>
  )
}
