import { Box, Stack, Typography } from '@mui/material'
import { DetailBlock } from '../../primitives/surfaces/DetailBlock.tsx'
import { useRef, useState, type ReactNode } from 'react'
import { AppButton } from '../../primitives/buttons/AppButton.tsx'
import type { AppButtonTone } from '../../primitives/buttons/app-button-tone.ts'
import { AppDialog } from './AppDialog.tsx'
import { InlineNotice } from '../messages/InlineNotice.tsx'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  subject?: ReactNode
  children?: ReactNode
  errorMessage?: string | null
  confirmLabel: string
  cancelLabel: string
  confirmTone?: 'primary' | 'danger'
  cancelTone?: AppButtonTone
  isBusy?: boolean
  confirmDisabled?: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  onExited?: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  subject,
  children,
  errorMessage,
  confirmLabel,
  cancelLabel,
  confirmTone = 'primary',
  cancelTone = 'secondary',
  isBusy = false,
  confirmDisabled = false,
  onClose,
  onConfirm,
  onExited,
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
      description={
        <Stack
          gap={1.5}
          sx={{
            mb: children || errorMessage ? 2 : 0,
            textAlign: 'center',
            overflowWrap: 'anywhere',
          }}
        >
          <Box>
            {typeof description === 'string' ? <Typography>{description}</Typography> : description}
          </Box>
          {subject != null ? (
            <DetailBlock sx={{ textAlign: 'center' }}>
              <Typography component="div" variant="body1" fontWeight={700}>
                {subject}
              </Typography>
            </DetailBlock>
          ) : null}
        </Stack>
      }
      {...(onExited ? { slotProps: { transition: { onExited } } } : {})}
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
            loading={busy}
          >
            {confirmLabel}
          </AppButton>
        </>
      }
    >
      {children}
      {errorMessage ? <InlineNotice severity="error">{errorMessage}</InlineNotice> : null}
    </AppDialog>
  )
}
