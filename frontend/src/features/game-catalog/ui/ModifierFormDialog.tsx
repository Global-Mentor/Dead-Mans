import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Stack, Typography, useMediaQuery, useTheme } from '@mui/material'
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
  FieldWithHelp,
  InlineNotice,
  SectionCard,
  useDirtyClose,
} from '../../../shared/ui/index.ts'
import { previewGameModifier } from '../api/catalog-modifiers-api.ts'
import {
  isModifierCompatibilityLockedError,
  resolveCatalogErrorMessage,
} from '../model/catalog-error.ts'
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
    'requiresHostMonitoring',
    'durationEnabled',
    'durationSeconds',
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
  const [isLatestLoading, setIsLatestLoading] = useState(false)
  const schema = useMemo(
    () =>
      createModifierFormSchema(
        {
          required: t('gameCatalog.validation.required'),
          number: t('gameCatalog.validation.number'),
          positiveInteger: t('gameCatalog.validation.positiveInteger'),
          payout: t('gameCatalog.validation.payout'),
          limit: t('gameCatalog.validation.limit'),
          tags: t('gameCatalog.validation.tags'),
        },
        isReadOnly ? 'create' : mode,
      ),
    [isReadOnly, mode, t],
  )
  const { control, clearErrors, getValues, handleSubmit, setError, setValue, trigger, formState } =
    useForm<ModifierFormValues>({
      defaultValues: createDefaultModifierFormValues(initial),
      resolver: zodResolver(schema),
    })
  const kind = useWatch({ control, name: 'kind' })
  const busy = isBusy || formState.isSubmitting || isPreviewLoading || isLatestLoading
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

  const loadLatest = async () => {
    if (!onLoadLatest || busy) return
    setIsLatestLoading(true)
    clearErrors('root')
    try {
      await onLoadLatest()
    } catch (error) {
      setError('root', { type: 'server', message: resolveCatalogErrorMessage(error, t) })
    } finally {
      setIsLatestLoading(false)
    }
  }

  const validateConflicts = () => {
    const selected = getValues('conflictingModifierIds')
    const original = initial?.conflictingModifierIds ?? []
    const changed = new Set([
      ...selected.filter((id) => !original.includes(id)),
      ...original.filter((id) => !selected.includes(id)),
    ])
    if (!modifiers.some((modifier) => modifier.isLockedByActiveGame && changed.has(modifier.id))) {
      clearErrors('conflictingModifierIds')
      return true
    }
    setError('conflictingModifierIds', {
      type: 'availability',
      message: t('gameCatalog.errors.compatibilityLocked'),
    })
    setPreview(null)
    setStep(1)
    return false
  }

  const goNext = async () => {
    if (!(await trigger(stepFields[step], { shouldFocus: true }))) {
      return
    }
    if (step === 1 && !validateConflicts()) return
    const nextStep = step === 1 && kind === 'rule' ? 3 : step + 1
    setStep(nextStep)
    if (nextStep === 3) {
      await loadPreview()
    }
  }

  const goBack = () => setStep(step === 3 && kind === 'rule' ? 1 : Math.max(0, step - 1))
  const submit = handleSubmit(async (values) => {
    if (isReadOnly || busy || !validateConflicts()) return
    if (!preview) {
      setStep(3)
      await loadPreview()
      return
    }
    try {
      await onSubmit(toModifierRequest(values))
    } catch (error) {
      if (isModifierCompatibilityLockedError(error)) {
        setStep(1)
        setPreview(null)
        setError('conflictingModifierIds', {
          type: 'server',
          message: resolveCatalogErrorMessage(error, t),
        })
        return
      }
      setError('root', { type: 'server', message: resolveCatalogErrorMessage(error, t) })
    }
  })

  const closeAction = (
    <AppButton
      tone="danger"
      onClick={close.requestClose}
      disabled={busy}
      sx={{
        gridColumn: { xs: step > 0 ? '1 / -1' : 'auto', sm: '1' },
        gridRow: { xs: step > 0 ? 2 : 1, sm: 1 },
        justifySelf: { xs: 'stretch', sm: 'start' },
      }}
    >
      {isReadOnly ? t('common.actions.close') : t('common.actions.cancel')}
    </AppButton>
  )

  return (
    <>
      <AppDialog
        open
        maxWidth="md"
        fullScreen={isMobile}
        onClose={close.requestClose}
        title={
          isReadOnly
            ? t('gameCatalog.modifiers.viewTitle')
            : mode === 'create'
              ? t('gameCatalog.modifiers.createTitle')
              : t('gameCatalog.modifiers.editTitle')
        }
        actions={
          <Box
            sx={{
              display: 'grid',
              width: '100%',
              gap: 1,
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: '1fr auto auto' },
              alignItems: 'center',
            }}
          >
            {!isMobile || step === 0 ? closeAction : null}
            {step > 0 ? (
              <AppButton
                tone="secondary"
                onClick={goBack}
                disabled={busy}
                sx={{ gridColumn: { xs: 1, sm: 2 }, gridRow: 1 }}
              >
                {t('common.actions.back')}
              </AppButton>
            ) : null}
            {step < 3 ? (
              <AppButton
                type="submit"
                form={modifierFormId}
                disabled={busy}
                sx={{ gridColumn: { xs: 2, sm: 3 }, gridRow: 1 }}
              >
                {t('common.actions.next')}
              </AppButton>
            ) : isReadOnly ? null : (
              <AppButton
                type="submit"
                form={modifierFormId}
                disabled={busy || !preview}
                sx={{ gridColumn: { xs: 2, sm: 3 }, gridRow: 1 }}
              >
                {t('common.actions.save')}
              </AppButton>
            )}
            {isMobile && step > 0 ? closeAction : null}
          </Box>
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
                <AppButton
                  size="small"
                  tone="secondary"
                  disabled={busy}
                  onClick={() => void loadLatest()}
                >
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
        <form
          id={modifierFormId}
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (busy) return
            if (step < 3) void goNext()
            else if (!isReadOnly) void submit(event)
          }}
        >
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
                activationCost={getValues('activationCost')}
                activationLimitCount={getValues('activationLimitCount')}
                conflictingModifierIds={getValues('conflictingModifierIds')}
                modifiers={modifiers}
                isLoading={isPreviewLoading}
                error={previewError}
                onRetry={() => void loadPreview()}
              />
              {!isReadOnly && mode === 'edit' ? (
                <Controller
                  name="changeNote"
                  control={control}
                  render={({ field: { ref, ...field }, fieldState }) => (
                    <FieldWithHelp
                      helpAlign="center"
                      label={t('gameCatalog.modifiers.fields.changeNote')}
                      help={t('gameCatalog.modifiers.fields.changeNoteHint')}
                    >
                      <FormTextField
                        {...field}
                        inputRef={ref}
                        label={t('gameCatalog.modifiers.fields.changeNote')}
                        required
                        helperText={fieldState.error?.message}
                        error={Boolean(fieldState.error)}
                        multiline
                        minRows={2}
                        inputProps={{ maxLength: 500 }}
                      />
                    </FieldWithHelp>
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
  return open ? <ModifierFormDialogBody key={props.initial?.id ?? props.mode} {...props} /> : null
}
