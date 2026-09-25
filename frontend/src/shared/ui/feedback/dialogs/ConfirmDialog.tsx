import { useRef, useState, type ReactNode } from 'react'
import { AppButton } from '../../primitives/buttons/AppButton.tsx'
import type { AppButtonTone } from '../../primitives/buttons/app-button-tone.ts'
import { AppDialog } from './AppDialog.tsx'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel: string
  confirmTone?: 'primary' | 'danger'
  cancelTone?: AppButtonTone
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
  cancelTone = 'secondary',
  isBusy = false,
  confirmDisabled = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const inFlightRef = useRef(false)
  const [isLocallyBusy, setIsLocallyBusy] = useState(false)
  const busy = isBusy || isLocallyBusy

  const handleConfirm = async () => {
    if (busy || confirmDisabled || inFlightRef.current) return
    inFlightRef.current = true
    setIsLocallyBusy(true)
    try {
      await onConfirm()
    } catch {
      // Mutation errors belong to the caller; keep its mounted dialog state intact.
    } finally {
      inFlightRef.current = false
      setIsLocallyBusy(false)
    }
  }

  return (
    <AppDialog
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      description={description}
      actions={
        <>
          <AppButton tone={cancelTone} size="large" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </AppButton>
          <AppButton
            tone={confirmTone === 'danger' ? 'danger' : 'primary'}
            size="large"
            onClick={() => void handleConfirm()}
            disabled={busy || confirmDisabled}
            loading={isLocallyBusy}
          >
            {confirmLabel}
          </AppButton>
        </>
      }
    />
  )
}
