import { IconButton, type IconButtonProps } from '@mui/material'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { sidePanelCloseSx } from '../../../theme/side-panel-sx.ts'
import { uiTokens } from '../../../theme/tokens.ts'

interface ActionIconProps extends IconButtonProps {
  'aria-label': string
  appearance?: 'plain' | 'framed' | 'outlined'
}
export function ActionIcon({ appearance = 'plain', sx, ...props }: ActionIconProps) {
  return (
    <IconButton
      type="button"
      {...props}
      sx={mergeSx(
        appearance === 'outlined'
          ? {
              border: 1,
              borderColor: 'divider',
              color: 'text.secondary',
              minHeight: {
                xs: uiTokens.control.height.standard,
                sm: uiTokens.control.height.compact,
              },
              minWidth: {
                xs: uiTokens.control.height.standard,
                sm: uiTokens.control.height.compact,
              },
              backgroundColor: 'action.hover',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
                backgroundColor: 'action.selected',
              },
              '&.Mui-disabled': {
                borderColor: 'divider',
                backgroundColor: 'transparent',
                opacity: 0.38,
              },
            }
          : appearance === 'framed'
            ? sidePanelCloseSx
            : {
                minWidth: uiTokens.control.height.standard,
                minHeight: uiTokens.control.height.standard,
                flexShrink: 0,
              },
        sx,
      )}
    />
  )
}
