import { Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppButton,
  AppDialog,
  DiscardChangesDialog,
  FormTextField,
  InlineNotice,
  useDirtyClose,
} from '../../../shared/ui/index.ts'
import { resolveCatalogErrorMessage } from '../model/catalog-error.ts'

interface QuestionCategoryDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  categoryId?: string | undefined
  initialName?: string
  isBusy: boolean
  onClose: () => void
  onSubmit: (name: string) => Promise<void>
}

function QuestionCategoryDialogBody({
  mode,
  initialName = '',
  isBusy,
  onClose,
  onSubmit,
}: Omit<QuestionCategoryDialogProps, 'open'>) {
  const { t } = useTranslation()
  const [baseline] = useState(initialName)
  const [name, setName] = useState(initialName)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const busy = isBusy || saving
  const close = useDirtyClose({ dirty: name !== baseline, busy, onClose })

  const handleSubmit = async () => {
    if (busy) return
    setSaving(true)
    setErrorMessage(null)

    try {
      await onSubmit(name.trim())
      onClose()
    } catch (error) {
      setErrorMessage(resolveCatalogErrorMessage(error, t))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AppDialog
        open
        onClose={close.requestClose}
        title={
          mode === 'create'
            ? t('gameCatalog.questions.categoryDialog.title')
            : t('gameCatalog.questions.categoryDialog.editTitle')
        }
        actions={
          <>
            <AppButton tone="ghost" onClick={close.requestClose} disabled={busy}>
              {t('common.actions.cancel')}
            </AppButton>
            <AppButton
              onClick={() => void handleSubmit()}
              disabled={busy || name.trim().length === 0}
            >
              {t('common.actions.save')}
            </AppButton>
          </>
        }
      >
        {errorMessage ? (
          <InlineNotice severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </InlineNotice>
        ) : null}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(
            mode === 'create'
              ? 'gameCatalog.questions.categoryDialog.description'
              : 'gameCatalog.questions.categoryDialog.editDescription',
          )}
        </Typography>
        <FormTextField
          autoFocus
          value={name}
          label={t('gameCatalog.questions.categoryDialog.nameLabel')}
          disabled={busy}
          inputProps={{ maxLength: 64 }}
          onChange={(event) => setName(event.target.value)}
        />
      </AppDialog>
      <DiscardChangesDialog
        open={close.confirmOpen}
        busy={busy}
        onClose={close.keepEditing}
        onDiscard={close.discard}
      />
    </>
  )
}

export function QuestionCategoryDialog({ open, ...props }: QuestionCategoryDialogProps) {
  return open ? (
    <QuestionCategoryDialogBody key={`${props.mode}-${props.categoryId ?? 'new'}`} {...props} />
  ) : null
}
