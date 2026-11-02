import { zodResolver } from '@hookform/resolvers/zod'
import { Stack } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type {
  CreateGameQuestionRequest,
  GameQuestionCatalogItem,
  GameQuestionCategoryItem,
} from '../../../shared/api/contracts/index.ts'
import { QuizScreenshotImage } from '../../../shared/game-ui/index.ts'
import {
  AppButton,
  AppDialog,
  ControlledFormTextField,
  ChoiceLabel,
  DiscardChangesDialog,
  FormSelect,
  FormSwitch,
  InlineNotice,
  useDirtyClose,
} from '../../../shared/ui/index.ts'
import { createQuestionMetadataSchema } from '../model/question-form-schema.ts'
import { resolveCatalogErrorMessage } from '../model/catalog-error.ts'

export function ScreenshotEditDialog({
  question,
  categories,
  isBusy,
  onClose,
  onSubmit,
}: {
  question: GameQuestionCatalogItem
  categories: readonly GameQuestionCategoryItem[]
  isBusy: boolean
  onClose: () => void
  onSubmit: (request: CreateGameQuestionRequest) => Promise<unknown>
}) {
  const { t } = useTranslation()
  const form = useForm({
    resolver: zodResolver(
      createQuestionMetadataSchema({
        required: t('gameCatalog.validation.required'),
        number: t('gameCatalog.validation.number'),
      }),
    ),
    defaultValues: {
      categoryId: question.categoryId,
      reward: String(question.reward),
      priority: String(question.priority ?? 0),
      isEnabled: question.isEnabled,
    },
  })
  const busy = isBusy || form.formState.isSubmitting
  const close = useDirtyClose({ dirty: form.formState.isDirty, busy, onClose })
  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit({
        ...values,
        reward: Number(values.reward),
        priority: Number(values.priority),
        text: question.text,
        options: question.options.map((option) => ({
          text: option.text,
          isCorrect: option.isCorrect,
        })),
      })
    } catch (error) {
      form.setError('root', { message: resolveCatalogErrorMessage(error, t) })
    }
  })
  return (
    <>
      <AppDialog
        open
        title={t('gameCatalog.screenshots.edit')}
        onClose={close.requestClose}
        actions={
          <>
            <AppButton tone="secondary" disabled={busy} onClick={close.requestClose}>
              {t('common.actions.cancel')}
            </AppButton>
            <AppButton tone="primary" type="submit" form="screenshot-edit-form" loading={busy}>
              {t('common.actions.save')}
            </AppButton>
          </>
        }
      >
        <Stack
          component="form"
          id="screenshot-edit-form"
          gap={2}
          onSubmit={(event) => void submit(event)}
        >
          {question.image ? <QuizScreenshotImage image={question.image} /> : null}
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field, fieldState }) => (
              <FormSelect
                {...field}
                label={t('gameCatalog.questions.fields.category')}
                disabled={busy}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                options={categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
              />
            )}
          />
          <ControlledFormTextField
            control={form.control}
            name="reward"
            label={t('gameCatalog.questions.fields.reward')}
            disabled={busy}
          />
          <ControlledFormTextField
            control={form.control}
            name="priority"
            label={t('gameCatalog.questions.fields.priority')}
            disabled={busy}
          />
          <Controller
            control={form.control}
            name="isEnabled"
            render={({ field }) => (
              <ChoiceLabel
                label={t('gameCatalog.questions.catalog.enabled')}
                control={
                  <FormSwitch
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    disabled={busy}
                  />
                }
              />
            )}
          />
          {form.formState.errors.root?.message ? (
            <InlineNotice severity="error">{form.formState.errors.root.message}</InlineNotice>
          ) : null}
        </Stack>
      </AppDialog>
      <DiscardChangesDialog
        open={close.confirmOpen}
        onClose={close.keepEditing}
        onDiscard={close.discard}
      />
    </>
  )
}
