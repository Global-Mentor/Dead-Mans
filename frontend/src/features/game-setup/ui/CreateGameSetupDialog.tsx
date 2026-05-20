import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../../shared/api/errors/ApiError.ts'

interface CreateGameSetupDialogProps {
  open: boolean
  isSubmitting: boolean
  onCreate: (title: string) => Promise<void>
}

export function CreateGameSetupDialog({
  open,
  isSubmitting,
  onCreate,
}: CreateGameSetupDialogProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleCreate = async () => {
    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      setErrorMessage(t('gameSetup.createDialog.validationRequired'))
      return
    }

    setErrorMessage(null)
    try {
      await onCreate(normalizedTitle)
      setTitle('')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrorMessage(t('gameSetup.createDialog.alreadyExists'))
        return
      }
      setErrorMessage(t('gameSetup.createDialog.error'))
    }
  }

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      aria-labelledby="create-game-setup-title"
    >
      <DialogTitle id="create-game-setup-title">{t('gameSetup.createDialog.title')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('gameSetup.createDialog.description')}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          label={t('gameSetup.createDialog.nameLabel')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={isSubmitting}
          error={errorMessage !== null}
          helperText={errorMessage ?? undefined}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void handleCreate()
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={() => void handleCreate()} disabled={isSubmitting}>
          {t('gameSetup.createDialog.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
