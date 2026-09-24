import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Stack, SvgIcon, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type {
  CreateGameQuestionRequest,
  GameQuestionCatalogItem,
  GameQuestionCategoryItem,
  TwitchQuizPreview,
} from '../../../shared/api/contracts/index.ts'
import {
  ActionIcon,
  AppButton,
  AppDialog,
  ChoiceLabel,
  ControlledFormTextField,
  DiscardChangesDialog,
  FormSelect,
  FormSwitch,
  HelpTooltip,
  InlineNotice,
  ItemCard,
  useDirtyClose,
} from '../../../shared/ui/index.ts'
import { previewTwitchQuizMessages } from '../../game-questions/api/game-questions-api.ts'
import { resolveCatalogErrorMessage } from '../model/catalog-error.ts'
import { getQuestionDisplayOptions } from '../model/question-answer-normalize.ts'
import {
  createQuestionFormSchema,
  maxQuestionAnswers,
  minQuestionAnswers,
  type QuestionFormValues,
} from '../model/question-form-schema.ts'

const questionFormId = 'catalog-question-form'

function createDefaultOptions(): QuestionFormValues['options'] {
  return Array.from({ length: 4 }, (_, index) => ({ text: '', isCorrect: index === 0 }))
}

function toDefaultValues(
  initial: GameQuestionCatalogItem | undefined,
  categories: readonly GameQuestionCategoryItem[],
): QuestionFormValues {
  if (!initial) {
    return {
      categoryId: categories[0]?.id ?? '',
      text: '',
      options: createDefaultOptions(),
      reward: '0',
      priority: '0',
      isEnabled: true,
    }
  }

  const options = getQuestionDisplayOptions(initial).sort(
    (left, right) => Number(right.isCorrect) - Number(left.isCorrect),
  )

  return {
    categoryId: initial.categoryId,
    text: initial.text,
    options: options.map((option, index) => ({ text: option.text, isCorrect: index === 0 })),
    reward: String(initial.reward),
    priority: String(initial.priority ?? 0),
    isEnabled: initial.isEnabled,
  }
}

function toRequest(values: QuestionFormValues): CreateGameQuestionRequest {
  return {
    categoryId: values.categoryId,
    text: values.text.trim(),
    options: values.options.map((option, index) => ({
      text: option.text,
      isCorrect: index === 0,
    })),
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
    correctAnswer: t('gameCatalog.validation.correctAnswer'),
  })

  const { control, handleSubmit, setError, setValue, setFocus, formState } =
    useForm<QuestionFormValues>({
      defaultValues: toDefaultValues(initial, categories),
      resolver: zodResolver(schema),
    })
  const busy = isBusy || formState.isSubmitting
  const close = useDirtyClose({ dirty: formState.isDirty, busy, onClose })
  const categoryValue = useWatch({ control, name: 'categoryId' }) ?? ''
  const questionText = useWatch({ control, name: 'text' }) ?? ''
  const watchedOptions = useWatch({ control, name: 'options' })
  const rewardValue = useWatch({ control, name: 'reward' }) ?? '0'
  const [twitchPreview, setTwitchPreview] = useState<TwitchQuizPreview | null>(null)
  const twitchOptionTexts = useMemo(
    () => (watchedOptions ?? []).map((option) => option.text),
    [watchedOptions],
  )
  const canPreviewTwitch = twitchOptionTexts.length >= minQuestionAnswers
  const visibleTwitchPreview = canPreviewTwitch ? twitchPreview : null

  useEffect(() => {
    if (!canPreviewTwitch) return
    let active = true
    const timer = window.setTimeout(() => {
      void previewTwitchQuizMessages(
        questionText,
        twitchOptionTexts,
        Math.max(0, Number.parseInt(rewardValue, 10) || 0),
      )
        .then((preview) => {
          if (active) setTwitchPreview(preview)
        })
        .catch(() => {
          if (active) setTwitchPreview(null)
        })
    }, 250)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [canPreviewTwitch, questionText, rewardValue, twitchOptionTexts])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options',
  })

  useEffect(() => {
    const firstCategory = categories[0]
    if (categoryValue.length === 0 && firstCategory) {
      setValue('categoryId', firstCategory.id)
    }
  }, [categories, categoryValue, setValue])

  const hasCategories = categories.length > 0
  const canAddAnswer = fields.length < maxQuestionAnswers

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }))

  const optionsRootError =
    formState.errors.options?.root?.message ?? formState.errors.options?.message

  const submit = handleSubmit(async (values) => {
    if (!hasCategories) {
      setError('categoryId', {
        type: 'manual',
        message: t('gameCatalog.questions.noCategories'),
      })
      return
    }

    try {
      await onSubmit(toRequest(values))
    } catch (error) {
      setError('root', { type: 'server', message: resolveCatalogErrorMessage(error, t) })
    }
  })

  return (
    <>
      <AppDialog
        open
        onClose={close.requestClose}
        title={
          mode === 'create'
            ? t('gameCatalog.questions.createTitle')
            : t('gameCatalog.questions.editTitle')
        }
        actions={
          <>
            <AppButton tone="ghost" onClick={close.requestClose} disabled={busy}>
              {t('common.actions.cancel')}
            </AppButton>
            <AppButton
              type="submit"
              form={questionFormId}
              loading={busy}
              disabled={busy || !hasCategories}
            >
              {t('common.actions.save')}
            </AppButton>
          </>
        }
      >
        {formState.errors.root ? (
          <InlineNotice severity="error" sx={{ mb: 2 }}>
            {formState.errors.root.message}
          </InlineNotice>
        ) : null}
        {optionsRootError ? (
          <InlineNotice severity="error" sx={{ mb: 2 }}>
            {optionsRootError}
          </InlineNotice>
        ) : null}
        {!hasCategories ? (
          <InlineNotice severity="warning" sx={{ mb: 2 }}>
            {t('gameCatalog.questions.noCategories')}
          </InlineNotice>
        ) : null}
        <form noValidate id={questionFormId} onSubmit={(event) => void submit(event)}>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Controller
              control={control}
              name="categoryId"
              render={({ field, fieldState }) => (
                <FormSelect
                  required
                  value={field.value}
                  options={categoryOptions}
                  label={t('gameCatalog.questions.fields.category')}
                  disabled={busy || !hasCategories}
                  error={fieldState.invalid}
                  helperText={fieldState.error?.message}
                  onChange={field.onChange}
                />
              )}
            />
            <ControlledFormTextField
              control={control}
              name="text"
              required
              label={t('gameCatalog.questions.fields.text')}
              multiline
              minRows={2}
              disabled={busy}
            />
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="subtitle2">
                  {t('gameCatalog.questions.fields.answers')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('gameCatalog.questions.fields.answersHint')}
                </Typography>
              </Box>
              <Box sx={{ borderLeft: '3px solid', borderColor: 'success.main', pl: 1.5 }}>
                <ControlledFormTextField
                  control={control}
                  name="options.0.text"
                  required
                  label={t('gameCatalog.questions.fields.correctAnswer')}
                  placeholder={t('gameCatalog.questions.fields.correctAnswerPlaceholder')}
                  disabled={busy}
                />
              </Box>
              {fields.slice(1).map((field, alternativeIndex) => {
                const index = alternativeIndex + 1
                const removeLabel = t('gameCatalog.questions.fields.removeAnswer', {
                  number: index,
                })
                return (
                  <Stack
                    key={field.id}
                    direction="row"
                    spacing={0.5}
                    alignItems="flex-start"
                    sx={{ borderLeft: '3px solid', borderColor: 'error.main', pl: 1.5 }}
                  >
                    <ControlledFormTextField
                      control={control}
                      name={`options.${index}.text`}
                      label={t('gameCatalog.questions.fields.answerAlternative', { number: index })}
                      disabled={busy}
                    />
                    <HelpTooltip title={removeLabel}>
                      <span>
                        <ActionIcon
                          aria-label={removeLabel}
                          size="small"
                          disabled={busy || fields.length <= minQuestionAnswers}
                          onClick={() => {
                            remove(index)
                            requestAnimationFrame(() =>
                              setFocus(`options.${Math.min(index, fields.length - 2)}.text`),
                            )
                          }}
                        >
                          <SvgIcon fontSize="small">
                            <path
                              d="m6 6 12 12M6 18 18 6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                          </SvgIcon>
                        </ActionIcon>
                      </span>
                    </HelpTooltip>
                  </Stack>
                )
              })}
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <AppButton
                  tone="ghost"
                  size="small"
                  type="button"
                  startIcon={
                    <SvgIcon fontSize="small">
                      <path
                        d="M12 5v14M5 12h14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </SvgIcon>
                  }
                  disabled={busy || !canAddAnswer}
                  onClick={() =>
                    append(
                      { text: '', isCorrect: false },
                      { focusName: `options.${fields.length}.text` },
                    )
                  }
                  sx={{ flexShrink: 0 }}
                >
                  {t('gameCatalog.questions.fields.addAnswer')}
                </AppButton>
                <Typography variant="caption" color="text.secondary" aria-live="polite">
                  {t('gameCatalog.questions.fields.answerCount', {
                    count: fields.length,
                    max: maxQuestionAnswers,
                  })}
                </Typography>
              </Stack>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <ControlledFormTextField
                control={control}
                name="reward"
                type="number"
                label={t('gameCatalog.questions.fields.reward')}
                disabled={busy}
              />
              <ControlledFormTextField
                control={control}
                name="priority"
                type="number"
                label={t('gameCatalog.questions.fields.priority')}
                disabled={busy}
              />
            </Stack>
            <Controller
              control={control}
              name="isEnabled"
              render={({ field }) => (
                <ChoiceLabel
                  control={
                    <FormSwitch
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      disabled={busy}
                    />
                  }
                  label={t('gameCatalog.questions.fields.isEnabled')}
                />
              )}
            />
            {visibleTwitchPreview ? (
              <ItemCard>
                <Typography variant="subtitle2">
                  {t('gameCatalog.questions.twitchPreview')}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                  {visibleTwitchPreview.question}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {visibleTwitchPreview.questionLength} / {visibleTwitchPreview.maximumLength}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                  {visibleTwitchPreview.options}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {visibleTwitchPreview.optionsLength} / {visibleTwitchPreview.maximumLength}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                  {visibleTwitchPreview.resultTemplate}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {visibleTwitchPreview.resultMaximumLength} / {visibleTwitchPreview.maximumLength}
                </Typography>
                {!visibleTwitchPreview.isCompatible ? (
                  <InlineNotice severity="error" sx={{ mt: 1 }}>
                    {t('gameCatalog.questions.twitchTooLong')}
                  </InlineNotice>
                ) : null}
              </ItemCard>
            ) : null}
          </Stack>
        </form>
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

export function QuestionFormDialog({ open, ...props }: QuestionFormDialogProps) {
  return open ? <QuestionFormDialogBody {...props} /> : null
}
