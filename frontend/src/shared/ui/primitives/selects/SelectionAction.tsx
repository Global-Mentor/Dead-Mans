import { Box } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ComponentProps } from 'react'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { feedbackSurfaceSx } from '../../../theme/feedback-surface-sx.ts'
import { getAppSurfaceSx } from '../../../theme/surface-sx.ts'
import { AppButton } from '../buttons/AppButton.tsx'

export function SelectionAction({
  selected,
  outcome,
  density = 'standard',
  appearance = 'standard',
  marker,
  children,
  sx,
  ...props
}: ComponentProps<typeof AppButton> & {
  selected: boolean
  outcome?: 'success' | 'error' | undefined
  density?: 'standard' | 'compact'
  appearance?: 'standard' | 'inset'
  marker?: string | undefined
}) {
  return (
    <AppButton
      {...props}
      aria-pressed={selected}
      sx={mergeSx(
        (theme) => ({
          justifyContent: 'space-between',
          textAlign: 'left',
          minWidth: 0,
          minHeight: density === 'compact' ? 44 : 52,
          px: 1.5,
          ...(density === 'compact'
            ? { py: 0.75, fontSize: '1rem', lineHeight: 1.3, fontWeight: 600 }
            : {}),
          textTransform: 'none',
          letterSpacing: 'normal',
          gap: 1.5,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
          ...(!marker
            ? {
                '& > span:first-of-type': { overflowWrap: 'anywhere' },
                '& > span:last-of-type:not(:first-of-type)': {
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                },
              }
            : {}),
          '& > span': {
            minWidth: 0,
            gap: theme.spacing(1),
          },
          ...(appearance === 'inset'
            ? {
                ...getAppSurfaceSx(theme, 'inset'),
                color: theme.palette.text.primary,
                borderImageSource: 'none',
                borderColor: alpha(theme.palette.primary.light, selected ? 0.65 : 0.25),
                backgroundColor: alpha(
                  selected ? theme.palette.primary.main : theme.palette.common.black,
                  selected ? 0.18 : 0.3,
                ),
                boxShadow: selected ? `inset 3px 0 0 ${theme.palette.primary.light}` : 'none',
                '&::before': { display: 'none' },
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.12),
                  borderColor: alpha(theme.palette.primary.light, 0.65),
                },
                '&.Mui-focusVisible': {
                  outline: `2px solid ${theme.palette.primary.light}`,
                  outlineOffset: 2,
                },
                '&.Mui-disabled': {
                  opacity: 1,
                  borderColor: alpha(theme.palette.primary.light, selected ? 0.65 : 0.25),
                  backgroundColor: alpha(
                    selected ? theme.palette.primary.main : theme.palette.common.black,
                    selected ? 0.18 : 0.3,
                  ),
                  boxShadow: selected ? `inset 3px 0 0 ${theme.palette.primary.light}` : 'none',
                  color: selected ? theme.palette.text.primary : theme.palette.text.secondary,
                  ...(outcome ? feedbackSurfaceSx(theme, outcome) : {}),
                },
              }
            : {
                backgroundColor: alpha(theme.palette.primary.main, selected ? 0.12 : 0.04),
                '&.Mui-disabled': {
                  opacity: 1,
                  color: outcome ? theme.palette[outcome].light : theme.palette.text.secondary,
                  ...(outcome
                    ? {
                        borderColor: alpha(theme.palette[outcome].main, 0.7),
                        backgroundColor: alpha(theme.palette[outcome].main, 0.18),
                      }
                    : {}),
                },
              }),
          ...(marker
            ? {
                justifyContent: 'flex-start',
                '& > .selection-action-marker': {
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  width: 28,
                  height: 28,
                  fontSize: '0.875rem',
                  lineHeight: 1,
                  fontWeight: 700,
                  color: theme.palette.primary.light,
                  border: `1px solid ${alpha(theme.palette.primary.light, 0.35)}`,
                  backgroundColor: alpha(theme.palette.common.black, 0.2),
                },
                '& > .selection-action-content': {
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  whiteSpace: 'normal',
                  '& > span:first-of-type': { minWidth: 0, overflowWrap: 'anywhere' },
                  '& > span:last-of-type:not(:first-of-type)': {
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  },
                },
              }
            : {}),
        }),
        sx,
      )}
    >
      {marker ? (
        <>
          <Box component="span" className="selection-action-marker" aria-hidden>
            {marker}
          </Box>
          <Box component="span" className="selection-action-content">
            {children}
          </Box>
        </>
      ) : (
        children
      )}
    </AppButton>
  )
}
