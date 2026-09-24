import type { Theme } from '@mui/material/styles'
import type { ComponentProps } from 'react'
import { AppButton } from '../../primitives/buttons/AppButton.tsx'

export type PanelTriggerPlacement = 'inline' | 'edge' | 'responsiveEdge'

function edgeTabSx(theme: Theme, side: 'left' | 'right') {
  return {
    [theme.breakpoints.up('lg')]: {
      position: 'fixed',
      [side]: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: theme.zIndex.drawer - 1,
      width: 44,
      minWidth: 44,
      height: 144,
      writingMode: 'vertical-rl',
      whiteSpace: 'nowrap',
    },
  } as const
}

interface PanelTriggerProps extends Omit<ComponentProps<typeof AppButton>, 'tone' | 'sx'> {
  placement?: PanelTriggerPlacement
  side?: 'left' | 'right'
}

/** A named action that opens a modal side panel; placement owns its complete geometry. */
export function PanelTrigger({
  placement = 'inline',
  side = 'right',
  ...props
}: PanelTriggerProps) {
  return (
    <AppButton
      {...props}
      tone={placement === 'edge' ? 'secondary' : 'ghost'}
      aria-haspopup="dialog"
      sx={(theme) =>
        placement === 'responsiveEdge'
          ? edgeTabSx(theme, side)
          : placement === 'inline'
            ? {}
            : {
                position: 'fixed',
                zIndex: theme.zIndex.drawer - 1,
                right: { xs: 12, md: 0 },
                top: { xs: 'auto', md: '50%' },
                bottom: { xs: 16, md: 'auto' },
                transform: { xs: 'none', md: 'translateY(-50%)' },
                minWidth: { xs: 0, md: 52 },
                minHeight: { xs: 46, md: 192 },
                writingMode: { xs: 'horizontal-tb', md: 'vertical-rl' },
                textOrientation: 'mixed',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
              }
      }
    />
  )
}
