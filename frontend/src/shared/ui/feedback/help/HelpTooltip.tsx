import { Tooltip, type TooltipProps } from '@mui/material'

/** Shared hover, focus and touch help. Explicit timings remain available for controlled popups. */
export function HelpTooltip(props: TooltipProps) {
  return <Tooltip enterTouchDelay={0} leaveTouchDelay={5000} {...props} />
}
