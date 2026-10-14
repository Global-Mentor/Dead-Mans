import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Stack, SvgIcon, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type {
  CreateGameQuestionRequest,
  GameQuestionCatalogItem,
  GameQuestionCategoryItem,
} from '../../../shared/api/contracts/index.ts'
import {
  ActionIcon,
  AppButton,
  AppDialog,
  ChoiceLabel,
  ControlledFormTextField,
  DiscardChangesDialog,
  ConfirmDialog,
  FormSelect,
  FormSwitch,
  HelpTooltip,
  InlineNotice,
  FormSection,
  FieldWithHelp,
  useDirtyClose,
} from '../../../shared/ui/index.ts'
import { QuestionTwitchPreview } from './QuestionTwitchPreview.tsx'
import { resolveCatalogErrorMessage } from '../model/catalog-error.ts'
import { toDefaultValues, toRequest } from '../model/question-form-values.ts'
import {
  createQuestionFormSchema,
  maxQuestionAnswers,
  minQuestionAnswers,
  type QuestionFormValues,
} from '../model/question-form-schema.ts'

const questionFormId = 'catalog-question-form'

interface QuestionFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: GameQuestionCatalogItem | undefined
  categories: readonly GameQuestionCategoryItem[]
  defaultCategoryId?: string | undefined
  isBusy: boolean
  onClose: () => void
  onSubmit: (request: CreateGameQuestionRequest) => Promise<void>
}

function QuestionFormDialogBody({
  mode,
  initial,
  categories,
  isBusy,
  defaultCategoryId,
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
      defaultValues: toDefaultValues(initial, categories, defaultCategoryId),
      resolver: zodResolver(schema),
    })
  const [pendingValues, setPendingValues] = useState<QuestionFormValues | null>(null)
  const [saving, setSaving] = useState(false)
  const busy = isBusy || formState.isSubmitting || saving
  const close = useDirtyClose({ dirty: formState.isDirty, busy, onClose })
  const categoryValue = useWatch({ control, name: 'categoryId' }) ?? ''
  const questionText = useWatch({ control, name: 'text' }) ?? ''
  const watchedOptions = useWatch({ control, name: 'options' })
  const rewardValue = useWatch({ control, name: 'reward' }) ?? '0'
  const twitchOptionTexts = useMemo(
    () => (watchedOptions ?? []).map((option) => option.text),
    [watchedOptions],
  )
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

  const save = async (values: QuestionFormValues) => {
    setSaving(true)
    try {
      await onSubmit(toRequest(values))
      setPendingValues(null)
    } catch (error) {
      setPendingValues(null)
      setError('root', { type: 'server', message: resolveCatalogErrorMessage(error, t) })
    } finally {
      setSaving(false)
    }
  }
  const submit = handleSubmit(async (values) => {
    if (busy) return
    if (!hasCategories) {
      setError('categoryId', { type: 'manual', message: t('gameCatalog.questions.noCategories') })
      return
    }
    setPendingValues(values)
  })

  return (
    <>
      <AppDialog
        open
        maxWidth="md"
        contentDensity="compact"
        onClose={close.requestClose}
        title={
          mode === 'create'
            ? t('gameCatalog.questions.createTitle')
            : t('gameCatalog.questions.editTitle')
        }
        actions={
          <>
            <AppButton tone="danger" onClick={close.requestClose} disabled={busy}>
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
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              pt: 0.5,
              alignItems: 'stretch',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
              gridTemplateAreas: {
                xs: '"content" "answers" "settings" "preview"',
                md: '"content settings" "answers answers" "preview preview"',
              },
            }}
          >
            <FormSection
              textAlign="center"
              headingSize="small"
              title={t('gameCatalog.questions.editor.content')}
              sx={{ gridArea: 'content' }}
            >
              <Stack gap={1.5}>
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
                  autoFocus
                  inputProps={{ maxLength: 2000 }}
                  label={t('gameCatalog.questions.fields.text')}
                  multiline
                  minRows={2}
                  disabled={busy}
                />
              </Stack>
            </FormSection>
            <FormSection
              textAlign="center"
              headingSize="small"
              title={t('gameCatalog.questions.fields.answers')}
              description={t('gameCatalog.questions.fields.answersHint')}
              sx={{ gridArea: 'answers' }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr)',
                  gap: 1.5,
                }}
              >
                <Box sx={{ pr: 6 }}>
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
                      sx={{ minWidth: 0 }}
                    >
                      <ControlledFormTextField
                        control={control}
                        name={`options.${index}.text`}
                        label={t('gameCatalog.questions.fields.answerAlternative', {
                          number: index,
                        })}
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
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ gridColumn: '1 / -1' }}
                >
                  <AppButton
                    tone="secondary"
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
              </Box>
            </FormSection>
            <FormSection
              textAlign="center"
              headingSize="small"
              title={t('gameCatalog.questions.editor.settings')}
              sx={{ gridArea: 'settings' }}
            >
              <Stack gap={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <FieldWithHelp
                    label={t('gameCatalog.questions.fields.reward')}
                    help={t('gameCatalog.questions.editor.rewardHelp')}
                    helpAlign="center"
                  >
                    <ControlledFormTextField
                      control={control}
                      name="reward"
                      type="number"
                      label={t('gameCatalog.questions.fields.reward')}
                      inputProps={{ min: 0, max: 2147483647, step: 1, inputMode: 'numeric' }}
                      disabled={busy}
                    />
                  </FieldWithHelp>
                  <FieldWithHelp
                    label={t('gameCatalog.questions.fields.priority')}
                    help={t('gameCatalog.questions.editor.priorityHelp')}
                    helpAlign="center"
                  >
                    <ControlledFormTextField
                      control={control}
                      name="priority"
                      type="number"
                      label={t('gameCatalog.questions.fields.priority')}
                      inputProps={{ min: -2147483648, max: 2147483647, step: 1 }}
                      disabled={busy}
                    />
                  </FieldWithHelp>
                </Stack>
                <FieldWithHelp
                  label={t('gameCatalog.questions.fields.isEnabled')}
                  help={t('gameCatalog.questions.editor.availabilityHelp')}
                  helpAlign="center"
                >
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
                </FieldWithHelp>
              </Stack>
            </FormSection>
            <Box sx={{ gridArea: 'preview', minWidth: 0 }}>
              <QuestionTwitchPreview
                text={questionText}
                options={twitchOptionTexts}
                reward={rewardValue}
              />
            </Box>
          </Box>
        </form>
      </AppDialog>
      <ConfirmDialog
        open={pendingValues !== null}
        title={t(
          mode === 'create'
            ? 'gameCatalog.questions.createConfirmTitle'
            : 'gameCatalog.questions.saveTitle',
        )}
        description={t(
          mode === 'create'
            ? 'gameCatalog.questions.createConfirm'
            : 'gameCatalog.questions.saveConfirm',
        )}
        subject={pendingValues?.text}
        confirmLabel={t('common.actions.save')}
        cancelLabel={t('common.actions.cancel')}
        isBusy={busy}
        onClose={() => setPendingValues(null)}
        onConfirm={async () => {
          if (pendingValues) await save(pendingValues)
        }}
      />
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
  return open ? (
    <QuestionFormDialogBody
      key={props.mode + '-' + (props.initial?.questionId ?? 'new')}
      {...props}
    />
  ) : null
}
