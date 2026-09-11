import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, FormControlLabel, Stack, Switch } from '@mui/material'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  AppButton,
  AppDialog,
  ControlledFormTextField,
  FormSelect,
} from '../../../shared/ui/index.ts'
import type {
  CreateGameQuestionRequest,
  GameQuestionCategoryItem,
  GameQuestionCatalogItem,
} from '../../../shared/api/contracts/index.ts'
import { uniqueTrimmedAnswers } from '../model/question-answer-normalize.ts'
import { createQuestionFormSchema, type QuestionFormValues } from '../model/question-form-schema.ts'
import { resolveCatalogErrorMessage } from '../model/catalog-error.ts'

const questionFormId = 'catalog-question-form'
const maxAnswers = 10

function toAnswerFields(values: readonly string[]): QuestionFormValues['answers'] {
  return values.map((value) => ({ value }))
}

function toDefaultValues(
  initial: GameQuestionCatalogItem | undefined,
  categories: readonly GameQuestionCategoryItem[],
): QuestionFormValues {
  if (!initial) {
    return {
      categoryId: categories[0]?.id ?? '',
      text: '',
      answers: toAnswerFields(['']),
      reward: '0',
      priority: '0',
      isEnabled: true,
    }
  }

  const rawAnswers = (initial.answers?.length ? initial.answers : [initial.answer]).map((answer) =>
    answer.trim(),
  )
  const answers = uniqueTrimmedAnswers(rawAnswers)

  return {
    categoryId: initial.categoryId,
    text: initial.text,
    answers: toAnswerFields(answers.length > 0 ? answers : [initial.answer]),
    reward: String(initial.reward),
    priority: String(initial.priority ?? 0),
    isEnabled: initial.isEnabled,
  }
}

function toRequest(
  values: QuestionFormValues,
  normalizedAnswers: string[],
): CreateGameQuestionRequest {
  return {
    categoryId: values.categoryId,
    text: values.text.trim(),
    answer: normalizedAnswers[0] ?? '',
    answers: normalizedAnswers,
    reward: Number.parseInt(values.reward, 10),
    isEnabled: values.isEnabled,
    priority: Number.parseInt(values.priority, 10),
  }
}

interface QuestionFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: GameQuestionCatalogItem | undefined
  categories: readonly GameQuestionCategoryItem[]
  isBusy: boolean
  onClose: () => void
  onSubmit: (request: CreateGameQuestionRequest) => Promise<void>
}

function QuestionFormDialogBody({
  mode,
  initial,
  categories,
  isBusy,
  onClose,
  onSubmit,
}: Omit<QuestionFormDialogProps, 'open'>) {
  const { t } = useTranslation()
  const schema = createQuestionFormSchema({
    required: t('gameCatalog.validation.required'),
    number: t('gameCatalog.validation.number'),
    tooLong: t('gameCatalog.validation.tooLong'),
    maxAnswers: t('gameCatalog.validation.answerLimit'),
    duplicateAnswers: t('gameCatalog.validation.duplicateAnswers'),
  })

  const { control, handleSubmit, setError, setValue, formState } = useForm<QuestionFormValues>({
    defaultValues: toDefaultValues(initial, categories),
    resolver: zodResolver(schema),
  })
  const categoryValue = useWatch({ control, name: 'categoryId' }) ?? ''

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'answers',
  })

  useEffect(() => {
    const firstCategory = categories[0]
    if (categoryValue.length === 0 && firstCategory) {
      setValue('categoryId', firstCategory.id)
    }
  }, [categories, categoryValue, setValue])

  const hasCategories = categories.length > 0
  const canAddAnswer = fields.length < maxAnswers

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }))

  const answersRootError =
    formState.errors.answers && !Array.isArray(formState.errors.answers)
      ? formState.errors.answers.message
      : null

  const submit = handleSubmit(async (values) => {
    if (!hasCategories) {
      setError('categoryId', {
        type: 'manual',
        message: t('gameCatalog.questions.noCategories'),
      })
      return
    }

    const normalizedAnswers = uniqueTrimmedAnswers(values.answers.map((item) => item.value))
    if (normalizedAnswers.length === 0) {
      setError('answers', {
        type: 'manual',
        message: t('gameCatalog.validation.required'),
      })
      return
    }

    if (normalizedAnswers.length > maxAnswers) {
      setError('answers', {
        type: 'manual',
        message: t('gameCatalog.validation.answerLimit'),
      })
      return
    }

    try {
      await onSubmit(toRequest(values, normalizedAnswers))
    } catch (error) {
      setError('root', { type: 'server', message: resolveCatalogErrorMessage(error, t) })
    }
  })

  return (
    <AppDialog
      open
      onClose={isBusy ? undefined : onClose}
      title={
        mode === 'create'
          ? t('gameCatalog.questions.createTitle')
          : t('gameCatalog.questions.editTitle')
      }
      actions={
        <>
          <AppButton tone="ghost" onClick={onClose} disabled={isBusy}>
            {t('common.actions.cancel')}
          </AppButton>
          <AppButton type="submit" form={questionFormId} disabled={isBusy || !hasCategories}>
            {t('common.actions.save')}
          </AppButton>
        </>
      }
    >
      {formState.errors.root ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {formState.errors.root.message}
        </Alert>
      ) : null}
      {answersRootError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {answersRootError}
        </Alert>
      ) : null}
      {!hasCategories ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('gameCatalog.questions.noCategories')}
        </Alert>
      ) : null}
      <form id={questionFormId} onSubmit={(event) => void submit(event)}>
        <Stack spacing={1.5}>
          <Controller
            control={control}
            name="categoryId"
            render={({ field, fieldState }) => (
              <FormSelect
                value={field.value}
                options={categoryOptions}
                label={t('gameCatalog.questions.fields.category')}
                disabled={isBusy || !hasCategories}
                error={fieldState.invalid}
                helperText={fieldState.error?.message}
                onChange={field.onChange}
              />
            )}
          />
          <ControlledFormTextField
            control={control}
            name="text"
            label={t('gameCatalog.questions.fields.text')}
            multiline
            minRows={2}
            disabled={isBusy}
          />
          <Stack spacing={1}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <span>{t('gameCatalog.questions.fields.answers')}</span>
                <AppButton
                  tone="secondary"
                  type="button"
                  disabled={isBusy || !canAddAnswer}
                  onClick={() => append({ value: '' })}
                >
                  {t('gameCatalog.questions.fields.addAnswer')}
                </AppButton>
              </Stack>
            </Stack>
            {fields.map((field, index) => (
              <Stack key={field.id} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <ControlledFormTextField
                  control={control}
                  name={`answers.${index}.value`}
                  label={
                    index === 0
                      ? t('gameCatalog.questions.fields.answer')
                      : `${t('gameCatalog.questions.fields.answerAlternative')} ${index}`
                  }
                  disabled={isBusy}
                />
                <AppButton
                  tone="ghost"
                  type="button"
                  onClick={() => void remove(index)}
                  disabled={isBusy || fields.length <= 1}
                >
                  {t('gameCatalog.questions.fields.removeAnswer')}
                </AppButton>
              </Stack>
            ))}
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <ControlledFormTextField
              control={control}
              name="reward"
              type="number"
              label={t('gameCatalog.questions.fields.reward')}
              disabled={isBusy}
            />
            <ControlledFormTextField
              control={control}
              name="priority"
              type="number"
              label={t('gameCatalog.questions.fields.priority')}
              disabled={isBusy}
            />
          </Stack>
          <Controller
            control={control}
            name="isEnabled"
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    disabled={isBusy}
                  />
                }
                label={t('gameCatalog.questions.fields.isEnabled')}
              />
            )}
          />
        </Stack>
      </form>
    </AppDialog>
  )
}

export function QuestionFormDialog({ open, ...props }: QuestionFormDialogProps) {
  return open ? <QuestionFormDialogBody {...props} /> : null
}
