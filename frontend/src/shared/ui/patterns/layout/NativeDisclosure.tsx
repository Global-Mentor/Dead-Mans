import { Box, type SxProps, type Theme } from '@mui/material'
import type { ReactNode } from 'react'
import { getAppSurfaceSx } from '../../../theme/surface-sx.ts'

interface NativeDisclosureProps {
  summary: ReactNode
  children: ReactNode
  open?: boolean
  onExpandedChange?: (expanded: boolean) => void
  pinned?: boolean
  centeredSummary?: boolean
  surface?: 'plain' | 'panel'
  'data-testid'?: string
  sx?: SxProps<Theme>
}
/** Lightweight native disclosure for archive pickers and read-only detail lists. */
export function NativeDisclosure({
  summary,
  children,
  open,
  onExpandedChange,
  pinned = false,
  centeredSummary = false,
  surface = 'plain',
  sx,
  ...props
}: NativeDisclosureProps) {
  return (
    <Box
      {...props}
      component="details"
      open={pinned || open}
      sx={[
        ...(surface === 'panel'
          ? [(theme: Theme) => ({ ...getAppSurfaceSx(theme, 'panel'), p: 1.25 })]
          : []),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        component="summary"
        onClick={
          onExpandedChange
            ? (event) => {
                event.preventDefault()
                onExpandedChange(!open)
              }
            : undefined
        }
        sx={{
          display: pinned ? 'none' : centeredSummary ? 'grid' : 'list-item',
          gridTemplateColumns: centeredSummary ? '16px minmax(0, 1fr) 16px' : undefined,
          alignItems: centeredSummary ? 'center' : undefined,
          listStyle: centeredSummary ? 'none' : undefined,
          minHeight: 44,
          py: centeredSummary ? 0.5 : 1,
          cursor: 'pointer',
          overflowWrap: 'anywhere',
          color: 'text.secondary',
          ...(centeredSummary ? { '&::-webkit-details-marker': { display: 'none' } } : {}),
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        {centeredSummary ? (
          <>
            <Box component="span" aria-hidden />
            <Box component="span" sx={{ minWidth: 0, textAlign: 'center' }}>
              {summary}
            </Box>
            <Box
              component="span"
              aria-hidden
              sx={{
                width: 8,
                height: 8,
                justifySelf: 'center',
                borderRight: '1px solid',
                borderBottom: '1px solid',
                borderColor: 'primary.main',
                transform: 'translateY(-2px) rotate(45deg)',
                'details[open] > summary &': {
                  transform: 'translateY(2px) rotate(225deg)',
                },
              }}
            />
          </>
        ) : (
          summary
        )}
      </Box>
      {children}
    </Box>
  )
}
