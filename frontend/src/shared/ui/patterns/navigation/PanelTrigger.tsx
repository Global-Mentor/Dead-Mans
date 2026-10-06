import type { Theme } from '@mui/material/styles'
import type { ComponentProps } from 'react'
import { uiTokens } from '../../../theme/tokens.ts'
import { AppButton } from '../../primitives/buttons/AppButton.tsx'

export type PanelTriggerPlacement = 'inline' | 'edge' | 'responsiveEdge'

function edgeTabSx(
  theme: Theme,
  side: 'left' | 'right',
  tabSize: 'compact' | 'standard' | 'extended',
) {
  return {
    [theme.breakpoints.up('lg')]: {
      position: 'fixed',
      [side]: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: theme.zIndex.drawer - 1,
      width:
        tabSize === 'compact' ? uiTokens.control.height.compact : uiTokens.control.height.standard,
      minWidth:
        tabSize === 'compact' ? uiTokens.control.height.compact : uiTokens.control.height.standard,
      height: tabSize === 'extended' ? 160 : tabSize === 'compact' ? 128 : 130,
      writingMode: 'vertical-rl',
      whiteSpace: 'nowrap',
    },
  } as const
}

interface PanelTriggerProps extends Omit<ComponentProps<typeof AppButton>, 'tone' | 'sx'> {
  placement?: PanelTriggerPlacement
  side?: 'left' | 'right'
  tabSize?: 'compact' | 'standard' | 'extended'
}

/** A named action that opens a modal side panel; placement owns its complete geometry. */
export function PanelTrigger({
  placement = 'inline',
  side = 'right',
  tabSize = 'standard',
  size = placement === 'responsiveEdge' || tabSize === 'compact' ? 'small' : 'medium',
  ...props
}: PanelTriggerProps) {
  return (
    <AppButton
      {...props}
      tone="secondary"
      size={size}
      aria-haspopup="dialog"
      sx={(theme) =>
        placement === 'responsiveEdge'
          ? {
              width: '100%',
              minWidth: 0,
              minHeight:
                tabSize === 'compact'
                  ? uiTokens.control.height.compact
                  : uiTokens.control.height.standard,
              fontSize: '0.9rem',
              ...edgeTabSx(theme, side, tabSize),
            }
          : placement === 'inline'
            ? {
                minHeight:
                  tabSize === 'compact'
                    ? uiTokens.control.height.compact
                    : uiTokens.control.height.standard,
              }
            : {
                position: 'fixed',
                zIndex: theme.zIndex.drawer - 1,
                right: { xs: 12, md: 0 },
                top: { xs: 'auto', md: '50%' },
                bottom: { xs: 16, md: 'auto' },
                transform: { xs: 'none', md: 'translateY(-50%)' },
                minWidth: { xs: 0, md: tabSize === 'compact' ? 36 : 52 },
                minHeight: {
                  xs: tabSize === 'compact' ? 36 : 46,
                  md: tabSize === 'compact' ? 128 : 192,
                },
                ...(tabSize === 'compact'
                  ? {
                      width: { xs: 'auto', md: 36 },
                      height: { xs: 36, md: 128 },
                      padding: '8px 4px',
                      fontSize: '0.875rem',
                    }
                  : {}),
                writingMode: { xs: 'horizontal-tb', md: 'vertical-rl' },
                textOrientation: 'mixed',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
              }
      }
    />
  )
}
