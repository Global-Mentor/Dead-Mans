import { Popover, styled, type PopoverProps } from '@mui/material'
import { popoverPanelSx } from './popover-panel-sx.ts'

const Panel = styled(Popover)(({ theme }) => ({
  '& .MuiPopover-paper': {
    ...popoverPanelSx(theme),
    padding: theme.spacing(2),
  },
}))

/** A focused settings panel with normal Tab order, Escape and trigger focus restoration. */
export function SettingsPopover({
  labelledBy,
  slotProps,
  ...props
}: PopoverProps & { labelledBy: string }) {
  return (
    <Panel
      {...props}
      slotProps={{
        ...slotProps,
        paper: (ownerState) => ({
          ...(typeof slotProps?.paper === 'function'
            ? slotProps.paper(ownerState)
            : slotProps?.paper),
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': labelledBy,
          tabIndex: -1,
        }),
      }}
    />
  )
}
