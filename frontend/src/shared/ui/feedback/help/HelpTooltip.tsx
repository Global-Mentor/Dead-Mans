import { Tooltip, type TooltipProps } from '@mui/material'

/** Shared hover, focus and touch help. Explicit timings remain available for controlled popups. */
export function HelpTooltip({ placement = 'bottom', ...props }: TooltipProps) {
  return (
    <Tooltip
      placement={placement}
      {...(placement === 'left'
        ? {
            slotProps: {
              popper: { modifiers: [{ name: 'flip', options: { fallbackPlacements: ['top'] } }] },
            },
            disableInteractive: true,
          }
        : {})}
      enterTouchDelay={0}
      leaveTouchDelay={5000}
      {...props}
    />
  )
}
