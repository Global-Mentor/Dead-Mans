import { Box, type SxProps, type Theme } from '@mui/material'
import { useState, type ReactNode } from 'react'
import { getAppSurfaceSx } from '../../../theme/surface-sx.ts'

interface NativeDisclosureProps {
  summary: ReactNode
  children: ReactNode
  density?: 'standard' | 'compact'
  indicator?: 'native' | 'chevron'
  open?: boolean
  onExpandedChange?: (expanded: boolean) => void
  pinned?: boolean
  surface?: 'plain' | 'panel'
  'data-testid'?: string
  sx?: SxProps<Theme>
}
/** Lightweight native disclosure for archive pickers and read-only detail lists. */
export function NativeDisclosure({
  summary,
  children,
  density = 'standard',
  indicator = 'native',
  open,
  onExpandedChange,
  pinned = false,
  surface = 'plain',
  sx,
  ...props
}: NativeDisclosureProps) {
  const [nativeExpanded, setNativeExpanded] = useState(false)

  return (
    <Box
      {...props}
      component="details"
      open={pinned || open}
      onToggle={(event) => setNativeExpanded(event.currentTarget.open)}
      sx={[
        ...(surface === 'panel'
          ? [(theme: Theme) => ({ ...getAppSurfaceSx(theme, 'panel'), p: 1.25 })]
          : []),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        component="summary"
        role={indicator === 'chevron' ? 'button' : undefined}
        aria-expanded={indicator === 'chevron' ? pinned || (open ?? nativeExpanded) : undefined}
        onClick={
          onExpandedChange
            ? (event) => {
                event.preventDefault()
                onExpandedChange(!open)
              }
            : undefined
        }
        sx={{
          display: pinned ? 'none' : 'list-item',
          minHeight: 44,
          py: density === 'compact' ? 0 : 1,
          alignContent: density === 'compact' ? 'center' : undefined,
          cursor: 'pointer',
          overflowWrap: 'anywhere',
          color: 'text.secondary',
          ...(indicator === 'chevron'
            ? {
                '&::marker': { content: '""' },
                '&::-webkit-details-marker': { display: 'none' },
              }
            : {}),
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        {indicator === 'chevron' ? (
          <Box
            component="span"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, width: '100%' }}
          >
            <Box component="span" sx={{ minWidth: 0, flex: 1 }}>
              {summary}
            </Box>
            <Box
              aria-hidden
              component="span"
              sx={{
                width: 10,
                height: 10,
                mr: 1,
                flexShrink: 0,
                borderRight: '2px solid',
                borderBottom: '2px solid',
                transform: 'translateY(-3px) rotate(45deg)',
                transition: 'transform 150ms ease',
                'details[open] &': { transform: 'translateY(3px) rotate(225deg)' },
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
              }}
            />
          </Box>
        ) : (
          summary
        )}
      </Box>
      {children}
    </Box>
  )
}
