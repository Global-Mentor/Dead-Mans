import type { AlertColor, SnackbarCloseReason } from '@mui/material'
import { Snackbar } from '@mui/material'
import type { SyntheticEvent } from 'react'
import { InlineNotice } from './messages/InlineNotice.tsx'

interface AppToastProps {
  message: string | null
  severity?: AlertColor
  autoHideDuration?: number
  onClose: () => void
}

export function AppToast({
  message,
  severity = 'info',
  autoHideDuration = 4000,
  onClose,
}: AppToastProps) {
  const handleClose = (_event?: SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
    if (reason === 'clickaway') {
      return
    }
    onClose()
  }

  if (!message?.trim()) {
    return null
  }

  return (
    <Snackbar
      open
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <InlineNotice onClose={onClose} severity={severity} variant="standard" sx={{ width: '100%' }}>
        {message}
      </InlineNotice>
    </Snackbar>
  )
}
