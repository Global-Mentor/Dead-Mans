import { zodResolver } from '@hookform/resolvers/zod'
import { Stack, Typography, useMediaQuery, useTheme } from '@mui/material'
import { useMemo, useState } from 'react'
import type { FieldPath } from 'react-hook-form'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type {
  CreateGameModifierRequest,
  GameModifierDefinition,
  GameModifierDraftPreview,
} from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  AppDialog,
  DiscardChangesDialog,
  FormTextField,
  InlineNotice,
  SectionCard,
  useDirtyClose,
} from '../../../shared/ui/index.ts'
import { previewGameModifier } from '../api/catalog-modifiers-api.ts'
import { resolveCatalogErrorMessage } from '../model/catalog-error.ts'
import {
  createDefaultModifierFormValues,
  createModifierFormSchema,
  toModifierRequest,
  type ModifierFormValues,
} from '../model/modifier-form-schema.ts'
import { ModifierActivationStep } from './ModifierActivationStep.tsx'
import { ModifierCardStep } from './ModifierCardStep.tsx'
import { ModifierImpactStep } from './ModifierImpactStep.tsx'
import { ModifierReviewStep } from './ModifierReviewStep.tsx'
import { ModifierWizardProgress } from './modifier-form-fields.tsx'

const modifierFormId = 'catalog-modifier-wizard-form'

interface ModifierFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: GameModifierDefinition | undefined
  modifiers: GameModifierDefinition[]
  isBusy: boolean
  isReadOnly?: boolean
  hasStaleConflict?: boolean
  staleLatest?: GameModifierDefinition | null
  onLoadLatest?: () => Promise<void>
  onClose: () => void
  onSubmit: (request: CreateGameModifierRequest) => Promise<void>
}

const stepFields: Record<number, FieldPath<ModifierFormValues>[]> = {
  0: ['kind', 'name', 'description', 'iconEmoji', 'tags'],
  1: [
    'activationCost',
    'activationLimitCount',
    'phase',
    'performer',
    'rule',
    'requiresHostMonitoring',
    'durationEnabled',
    'durationSeconds',
    'activationCommand',
  ],
  2: [
    'measurementDomain',
    'killMeasurementMode',
    'eventMeasurementMode',
    'eventInputLabel',
    'eventMaximumKind',
    'eventsPerActivation',
    'payoutKind',
    'payoutValue',
    'zeroCountPenaltyPoints',
  ],
  3: [],
}

function ModifierFormDialogBody({
  mode,
  initial,
  modifiers,
  isBusy,
  isReadOnly = false,
  hasStaleConflict = false,
  staleLatest,
  onLoadLatest,
  onClose,
  onSubmit,
}: Omit<ModifierFormDialogProps, 'open'>) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [step, setStep] = useState(0)
  const [preview, setPreview] = useState<GameModifierDraftPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const schema = useMemo(
    () =>
      createModifierFormSchema({
        required: t('gameCatalog.validation.required'),
        number: t('gameCatalog.validation.number'),
        limit: t('gameCatalog.validation.limit'),
        tags: t('gameCatalog.validation.tags'),
      }),
    [t],
  )
  const { control, getValues, handleSubmit, setError, setValue, trigger, formState } =
    useForm<ModifierFormValues>({
      defaultValues: createDefaultModifierFormValues(initial),
      resolver: zodResolver(schema),
    })
  const kind = useWatch({ control, name: 'kind' })
  const busy = isBusy || formState.isSubmitting || isPreviewLoading
  const disabled = busy || isReadOnly
  const close = useDirtyClose({ dirty: !isReadOnly && formState.isDirty, busy, onClose })

  const loadPreview = async () => {
    setIsPreviewLoading(true)
    setPreviewError(null)
    try {
      setPreview(await previewGameModifier(toModifierRequest(getValues())))
    } catch (error) {
      setPreview(null)
      setPreviewError(resolveCatalogErrorMessage(error, t))
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const goNext = async () => {
    if (!(await trigger(stepFields[step], { shouldFocus: true }))) {
      return
    }
    const nextStep = step === 1 && kind === 'rule' ? 3 : step + 1
    setStep(nextStep)
    if (nextStep === 3) {
      await loadPreview()
    }
  }

  const goBack = () => setStep(step === 3 && kind === 'rule' ? 1 : Math.max(0, step - 1))
  const submit = handleSubmit(async (values) => {
    if (!preview) {
      setStep(3)
      await loadPreview()
      return
    }
    try {
      await onSubmit(toModifierRequest(values))
    } catch (error) {
      setError('root', { type: 'server', message: resolveCatalogErrorMessage(error, t) })
    }
  })

  return (
    <>
      <AppDialog
        open
        maxWidth="md"
        fullScreen={isMobile}
        onClose={close.requestClose}
        title={
          mode === 'create'
            ? t('gameCatalog.modifiers.createTitle')
            : t('gameCatalog.modifiers.editTitle')
        }
        actions={
          <Stack direction="row" spacing={1} width="100%" justifyContent="space-between">
            <AppButton tone="ghost" onClick={close.requestClose} disabled={busy}>
              {isReadOnly ? t('common.actions.close') : t('common.actions.cancel')}
            </AppButton>
            <Stack direction="row" spacing={1}>
              {step > 0 ? (
                <AppButton tone="secondary" onClick={goBack} disabled={busy}>
                  {t('common.actions.back')}
                </AppButton>
              ) : null}
              {step < 3 ? (
                <AppButton onClick={() => void goNext()} disabled={busy}>
                  {t('common.actions.next')}
                </AppButton>
              ) : isReadOnly ? null : (
                <AppButton
                  type="submit"
                  form={modifierFormId}
                  disabled={busy || isPreviewLoading || !preview}
                >
                  {t('common.actions.save')}
                </AppButton>
              )}
            </Stack>
          </Stack>
        }
      >
        <ModifierWizardProgress step={step} kind={kind} />
        {formState.errors.root ? (
          <InlineNotice severity="error" sx={{ mb: 2 }}>
            {formState.errors.root.message}
          </InlineNotice>
        ) : null}
        {hasStaleConflict ? (
          <InlineNotice
            severity="warning"
            sx={{ mb: 2 }}
            action={
              staleLatest || !onLoadLatest ? null : (
                <AppButton size="small" tone="secondary" onClick={() => void onLoadLatest()}>
                  {t('gameCatalog.modifiers.loadLatest')}
                </AppButton>
              )
            }
          >
            {t('gameCatalog.modifiers.staleDraftPreserved')}
          </InlineNotice>
        ) : null}
        {staleLatest ? (
          <SectionCard surface="plain" sx={{ p: 1.5, mb: 2 }}>
            <Typography variant="subtitle2">
              {t('gameCatalog.modifiers.latestForComparison', {
                revision: staleLatest.revision,
              })}
            </Typography>
            <Typography>{staleLatest.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {staleLatest.description}
            </Typography>
            <Typography variant="caption">
              {t('gameCatalog.modifiers.latestCostAndLimit', {
                cost: staleLatest.activationCost,
                limit: staleLatest.activationLimit.count ?? t('gameCatalog.modifiers.unlimited'),
              })}
            </Typography>
          </SectionCard>
        ) : null}
        {isReadOnly ? (
          <InlineNotice severity="info" sx={{ mb: 2 }}>
            {t('gameCatalog.modifiers.contentLockedReason')}
          </InlineNotice>
        ) : null}
        <form id={modifierFormId} onSubmit={(event) => void submit(event)}>
          {step === 0 ? <ModifierCardStep control={control} disabled={disabled} /> : null}
          {step === 1 ? (
            <ModifierActivationStep
              control={control}
              disabled={disabled}
              initial={initial}
              kind={kind}
              modifiers={modifiers}
              setValue={setValue}
            />
          ) : null}
          {step === 2 ? (
            <ModifierImpactStep control={control} disabled={disabled} setValue={setValue} />
          ) : null}
          {step === 3 ? (
            <Stack spacing={2}>
              <ModifierReviewStep
                preview={preview}
                isLoading={isPreviewLoading}
                error={previewError}
                onRetry={() => void loadPreview()}
              />
              {!isReadOnly ? (
                <Controller
                  name="changeNote"
                  control={control}
                  render={({ field, fieldState }) => (
                    <FormTextField
                      {...field}
                      label={t('gameCatalog.modifiers.fields.changeNote')}
                      helperText={
                        fieldState.error?.message ??
                        t('gameCatalog.modifiers.fields.changeNoteHint')
                      }
                      error={Boolean(fieldState.error)}
                      multiline
                      minRows={2}
                      inputProps={{ maxLength: 500 }}
                    />
                  )}
                />
              ) : null}
            </Stack>
          ) : null}
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

export function ModifierFormDialog({ open, ...props }: ModifierFormDialogProps) {
  return open ? <ModifierFormDialogBody {...props} /> : null
}
