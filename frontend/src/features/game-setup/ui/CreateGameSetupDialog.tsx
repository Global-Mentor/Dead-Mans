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
import { GAME_SETUP_MAX_TITLE_LENGTH } from '../model/game-setup-limits.ts'

type CreateGameSetupDialogStep = 'prompt' | 'details'

interface CreateGameSetupDialogProps {
  open: boolean
  isSubmitting: boolean
  onCreate: (title: string) => Promise<void>
}

interface CreateGameSetupDialogFormProps {
  isSubmitting: boolean
  onCreate: (title: string) => Promise<void>
}

function CreateGameSetupDialogForm({ isSubmitting, onCreate }: CreateGameSetupDialogFormProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<CreateGameSetupDialogStep>('prompt')
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
      setStep('prompt')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrorMessage(t('gameSetup.createDialog.alreadyExists'))
        return
      }
      setErrorMessage(t('gameSetup.createDialog.error'))
    }
  }

  const isPromptStep = step === 'prompt'

  return (
    <>
      <DialogTitle id="create-game-setup-title">
        {isPromptStep ? t('gameSetup.createDialog.promptTitle') : t('gameSetup.createDialog.title')}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: isPromptStep ? 0 : 2 }}>
          {isPromptStep
            ? t('gameSetup.createDialog.promptDescription')
            : t('gameSetup.createDialog.detailsDescription')}
        </Typography>
        {!isPromptStep ? (
          <TextField
            autoFocus
            fullWidth
            label={t('gameSetup.createDialog.nameLabel')}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSubmitting}
            error={errorMessage !== null}
            helperText={errorMessage ?? undefined}
            inputProps={{ maxLength: GAME_SETUP_MAX_TITLE_LENGTH }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void handleCreate()
              }
            }}
          />
        ) : null}
      </DialogContent>
      <DialogActions>
        {!isPromptStep ? (
          <Button onClick={() => setStep('prompt')} disabled={isSubmitting}>
            {t('gameSetup.createDialog.back')}
          </Button>
        ) : null}
        {isPromptStep ? (
          <Button variant="contained" onClick={() => setStep('details')}>
            {t('gameSetup.createDialog.startCreate')}
          </Button>
        ) : (
          <Button variant="contained" onClick={() => void handleCreate()} disabled={isSubmitting}>
            {t('gameSetup.createDialog.confirm')}
          </Button>
        )}
      </DialogActions>
    </>
  )
}

export function CreateGameSetupDialog({
  open,
  isSubmitting,
  onCreate,
}: CreateGameSetupDialogProps) {
  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      aria-labelledby="create-game-setup-title"
    >
      {open ? <CreateGameSetupDialogForm isSubmitting={isSubmitting} onCreate={onCreate} /> : null}
    </Dialog>
  )
}
