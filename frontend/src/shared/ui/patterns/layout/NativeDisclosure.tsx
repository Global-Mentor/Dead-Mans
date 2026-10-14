import { Box, type SxProps, type Theme } from '@mui/material'
import { useState, type ReactNode } from 'react'
import { getAppSurfaceSx } from '../../../theme/surface-sx.ts'

interface NativeDisclosureProps {
  summary: ReactNode
  children: ReactNode
  density?: 'standard' | 'compact' | 'tight'
  indicator?: 'native' | 'chevron' | 'inline-chevron'
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
  const customIndicator = indicator !== 'native'
  const inlineIndicator = indicator === 'inline-chevron'

  return (
    <Box
      {...props}
      component="details"
      open={pinned || open}
      onToggle={(event) => setNativeExpanded(event.currentTarget.open)}
      sx={[
        ...(surface === 'panel'
          ? [
              (theme: Theme) => ({
                ...getAppSurfaceSx(theme, 'panel'),
                px: 1.25,
                py: density === 'tight' ? 0.5 : 1.25,
              }),
            ]
          : []),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        component="summary"
        role={customIndicator ? 'button' : undefined}
        aria-expanded={customIndicator ? pinned || (open ?? nativeExpanded) : undefined}
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
          minHeight: density === 'tight' ? 36 : 44,
          py: density === 'standard' ? 1 : 0,
          alignContent: density !== 'standard' ? 'center' : undefined,
          cursor: 'pointer',
          overflowWrap: 'anywhere',
          color: 'text.secondary',
          ...(customIndicator
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
        {customIndicator ? (
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
                width: inlineIndicator ? 6 : 10,
                height: inlineIndicator ? 6 : 10,
                mr: inlineIndicator ? 0 : 1,
                order: inlineIndicator ? -1 : undefined,
                flexShrink: 0,
                borderRight: inlineIndicator ? '1.5px solid' : '2px solid',
                borderBottom: inlineIndicator ? '1.5px solid' : '2px solid',
                transform: `translateY(-${inlineIndicator ? 2 : 3}px) rotate(45deg)`,
                transition: 'transform 150ms ease',
                'details[open] > summary &': {
                  transform: `translateY(${inlineIndicator ? 2 : 3}px) rotate(225deg)`,
                },
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
