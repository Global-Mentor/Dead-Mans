import { Alert, Snackbar } from '@mui/material'
import type { AlertColor, SnackbarCloseReason } from '@mui/material'
import type { SyntheticEvent } from 'react'

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

  return (
    <Snackbar
      open={message !== null}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={severity} variant="standard" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  )
}
