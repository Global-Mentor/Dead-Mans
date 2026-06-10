import { zodResolver } from '@hookform/resolvers/zod'
import { Typography } from '@mui/material'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import {
  AppButton,
  AppDialog,
  ControlledFormTextField,
} from '../../../shared/ui/index.ts'
import { ApiError } from '../../../shared/api/errors/ApiError.ts'
import { GAME_SETUP_MAX_TITLE_LENGTH } from '../model/game-setup-limits.ts'

type CreateGameSetupDialogStep = 'prompt' | 'details'
const createGameSetupFormId = 'create-game-setup-form'

interface CreateGameSetupFormValues {
  title: string
}

interface CreateGameSetupDialogProps {
  open: boolean
  isSubmitting: boolean
  onCreate: (title: string) => Promise<void>
}

interface CreateGameSetupDialogBodyProps {
  isSubmitting: boolean
  onCreate: (title: string) => Promise<void>
}

function CreateGameSetupDialogBody({ isSubmitting, onCreate }: CreateGameSetupDialogBodyProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<CreateGameSetupDialogStep>('prompt')
  const formSchema = z.object({
    title: z
      .string()
      .trim()
      .min(1, t('gameSetup.createDialog.validationRequired'))
      .max(GAME_SETUP_MAX_TITLE_LENGTH, t('gameSetup.invalidTitle')),
  })
  const {
    control,
    handleSubmit,
    reset,
    setError,
  } = useForm<CreateGameSetupFormValues>({
    defaultValues: { title: '' },
    resolver: zodResolver(formSchema),
  })

  const handleCreate = handleSubmit(async ({ title }) => {
    try {
      await onCreate(title)
      reset()
      setStep('prompt')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError('title', {
          type: 'server',
          message: t('gameSetup.createDialog.alreadyExists'),
        })
        return
      }
      setError('title', {
        type: 'server',
        message: t('gameSetup.createDialog.error'),
      })
    }
  })

  const isPromptStep = step === 'prompt'

  return (
    <AppDialog
      open
      disableEscapeKeyDown
      onClose={() => undefined}
      title={isPromptStep ? t('gameSetup.createDialog.promptTitle') : t('gameSetup.createDialog.title')}
      actions={
        <>
          {!isPromptStep ? (
            <AppButton tone="ghost" onClick={() => setStep('prompt')} disabled={isSubmitting}>
              {t('gameSetup.createDialog.back')}
            </AppButton>
          ) : null}
          {isPromptStep ? (
            <AppButton onClick={() => setStep('details')}>
              {t('gameSetup.createDialog.startCreate')}
            </AppButton>
          ) : (
            <AppButton
              type="submit"
              form={createGameSetupFormId}
              disabled={isSubmitting}
            >
              {t('gameSetup.createDialog.confirm')}
            </AppButton>
          )}
        </>
      }
    >
        <Typography variant="body2" color="text.secondary" sx={{ mb: isPromptStep ? 0 : 2 }}>
          {isPromptStep
            ? t('gameSetup.createDialog.promptDescription')
            : t('gameSetup.createDialog.detailsDescription')}
        </Typography>
        {!isPromptStep ? (
          <form id={createGameSetupFormId} onSubmit={(event) => void handleCreate(event)}>
            <ControlledFormTextField
              autoFocus
              control={control}
              name="title"
              label={t('gameSetup.createDialog.nameLabel')}
              disabled={isSubmitting}
              inputProps={{ maxLength: GAME_SETUP_MAX_TITLE_LENGTH }}
            />
          </form>
        ) : null}
    </AppDialog>
  )
}

export function CreateGameSetupDialog({
  open,
  isSubmitting,
  onCreate,
}: CreateGameSetupDialogProps) {
  return open ? <CreateGameSetupDialogBody isSubmitting={isSubmitting} onCreate={onCreate} /> : null
}
