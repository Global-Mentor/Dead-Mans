import { type ReactNode } from 'react'
import { AppButton } from './AppButton.tsx'
import { AppDialog } from './AppDialog.tsx'

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
    <AppDialog
      open={open}
      onClose={isBusy ? undefined : onClose}
      title={title}
      description={description}
      actions={
        <>
        <AppButton tone="ghost" onClick={onClose} disabled={isBusy}>
          {cancelLabel}
        </AppButton>
        <AppButton
          tone={confirmTone === 'danger' ? 'danger' : 'primary'}
          onClick={() => void onConfirm()}
          disabled={isBusy}
        >
          {confirmLabel}
        </AppButton>
        </>
      }
    />
  )
}

