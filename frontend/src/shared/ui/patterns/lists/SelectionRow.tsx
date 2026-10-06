import type { ButtonBaseProps } from '@mui/material'
import { ButtonBase } from '@mui/material'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { cornerFrameSx } from '../../../theme/corner-frame-sx.ts'
import { uiTokens } from '../../../theme/tokens.ts'
import { itemCardSx } from '../../primitives/surfaces/item-card-sx.ts'

interface SelectionRowProps extends ButtonBaseProps {
  selected: boolean
  selectionAppearance?: 'surface' | 'outline'
  emphasis?: 'none' | 'available' | 'selected'
  tone?: 'default' | 'alternate'
  density?: 'standard' | 'compact'
}

/** A wrapping, keyboard-operable choice in a list. Selection never depends on colour alone. */
export function SelectionRow({
  selected,
  selectionAppearance = 'surface',
  emphasis,
  tone = 'default',
  density = 'standard',
  role,
  sx,
  ...props
}: SelectionRowProps) {
  return (
    <ButtonBase
      {...props}
      role={role}
      {...(role === 'row' ? { 'aria-selected': selected } : { 'aria-pressed': selected })}
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
          ...itemCardSx(
            theme,
            emphasis ?? (selected && selectionAppearance === 'surface' ? 'selected' : 'none'),
            tone,
          ),
          ...(density === 'compact' ? { px: 1.25, py: 0.75 } : {}),
          ...(selectionAppearance === 'outline' && (selected || emphasis === 'selected')
            ? {
                ...cornerFrameSx(theme, 'strong'),
                borderImage: 'none',
                ...(selected
                  ? { boxShadow: `inset 0 0 0 1px ${theme.palette.primary.light}` }
                  : {}),
              }
            : {}),
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
