import { alpha } from '@mui/material/styles'
import type { ComponentProps } from 'react'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { AppButton } from '../buttons/AppButton.tsx'

export function SelectionAction({
  selected,
  outcome,
  sx,
  ...props
}: ComponentProps<typeof AppButton> & {
  selected: boolean
  outcome?: 'success' | 'error' | undefined
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
          minHeight: 52,
          px: 1.5,
          textTransform: 'none',
          letterSpacing: 'normal',
          gap: 1.5,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
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
          '& > span:first-of-type': { overflowWrap: 'anywhere' },
          '& > span:last-of-type:not(:first-of-type)': {
            flexShrink: 0,
            whiteSpace: 'nowrap',
          },
          '& > span': {
            minWidth: 0,
            gap: theme.spacing(1),
          },
        }),
        sx,
      )}
    />
  )
}
