import { type ReactNode } from 'react'
import { AppButton } from '../primitives/AppButton.tsx'
import type { AppButtonTone } from '../primitives/app-button-tone.ts'
import { AppDialog } from './AppDialog.tsx'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel: string
  confirmTone?: 'primary' | 'danger'
  cancelTone?: AppButtonTone
  dividers?: boolean
  accented?: boolean
  isBusy?: boolean
  confirmDisabled?: boolean
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
  cancelTone = 'ghost',
  dividers = false,
  accented = false,
  isBusy = false,
  confirmDisabled = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AppDialog
      open={open}
      onClose={isBusy ? undefined : onClose}
      title={title}
      description={description}
      dividers={dividers}
      accented={accented}
      actions={
        <>
          <AppButton tone={cancelTone} onClick={onClose} disabled={isBusy}>
            {cancelLabel}
          </AppButton>
          <AppButton
            tone={confirmTone === 'danger' ? 'danger' : 'primary'}
            onClick={() => void onConfirm()}
            disabled={isBusy || confirmDisabled}
          >
            {confirmLabel}
          </AppButton>
        </>
      }
    />
  )
}
