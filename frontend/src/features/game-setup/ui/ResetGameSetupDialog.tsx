import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

interface ResetGameSetupDialogProps {
  open: boolean
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export function ResetGameSetupDialog({
  open,
  isSubmitting,
  onClose,
  onConfirm,
}: ResetGameSetupDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('gameSetup.resetDialog.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t('gameSetup.resetDialog.description')}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          {t('gameSetup.resetDialog.cancel')}
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={isSubmitting}
          onClick={() => void onConfirm()}
        >
          {isSubmitting ? t('gameSetup.resetDialog.submitting') : t('gameSetup.resetDialog.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
