import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import type { DialogProps } from '@mui/material'
import { useId, type ReactNode } from 'react'

interface AppDialogProps extends Omit<DialogProps, 'title'> {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

export function AppDialog({ title, description, actions, children, ...dialogProps }: AppDialogProps) {
  const descriptionId = useId()

  return (
    <Dialog fullWidth maxWidth="sm" {...dialogProps} aria-describedby={description ? descriptionId : undefined}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {typeof description === 'string' ? (
          <Typography id={descriptionId} variant="body2" color="text.secondary" sx={{ mb: children ? 2 : 0 }}>
            {description}
          </Typography>
        ) : description ? (
          <div id={descriptionId}>{description}</div>
        ) : null}
        {children}
      </DialogContent>
      {actions ? <DialogActions>{actions}</DialogActions> : null}
    </Dialog>
  )
}
