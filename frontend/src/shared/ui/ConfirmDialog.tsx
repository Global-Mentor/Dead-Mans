import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { AppButton } from './AppButton.tsx'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel: string
  confirmTone?: 'primary' | 'danger'
  isBusy?: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmTone = 'primary',
  isBusy = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={isBusy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {typeof description === 'string' ? <Typography variant="body2">{description}</Typography> : description}
      </DialogContent>
      <DialogActions>
        <AppButton tone="ghost" onClick={onClose} disabled={isBusy}>
          {cancelLabel}
        </AppButton>
        <AppButton tone={confirmTone === 'danger' ? 'danger' : 'primary'} onClick={() => void onConfirm()} disabled={isBusy}>
          {confirmLabel}
        </AppButton>
      </DialogActions>
    </Dialog>
  )
}

