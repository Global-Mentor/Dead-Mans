import type { ButtonBaseProps } from '@mui/material'
import { ButtonBase } from '@mui/material'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { uiTokens } from '../../../theme/tokens.ts'
import { itemCardSx } from '../../primitives/surfaces/item-card-sx.ts'

interface SelectionRowProps extends ButtonBaseProps {
  selected: boolean
}

/** A wrapping, keyboard-operable choice in a list. Selection never depends on colour alone. */
export function SelectionRow({ selected, sx, ...props }: SelectionRowProps) {
  return (
    <ButtonBase
      {...props}
      aria-pressed={selected}
      sx={mergeSx(
        (theme) => ({
          width: '100%',
          minWidth: 0,
          minHeight: uiTokens.control.height.standard,
          flexShrink: 0,
          justifyContent: 'flex-start',
          textAlign: 'left',
          textTransform: 'none',
          letterSpacing: 'normal',
          overflowWrap: 'anywhere',
          border: '1px solid transparent',
          borderRadius: theme.shape.borderRadius,
          color: theme.palette.text.primary,
          ...itemCardSx(theme, selected ? 'selected' : 'none'),
          '&:hover': { borderColor: theme.palette.primary.light },
          '&.Mui-focusVisible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: -2,
          },
          '&.Mui-disabled': { opacity: theme.palette.action.disabledOpacity },
        }),
        sx,
      )}
    />
  )
}
