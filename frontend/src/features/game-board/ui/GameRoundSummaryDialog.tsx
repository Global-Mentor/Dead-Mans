import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Stack, Typography } from '@mui/material'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { ApiError } from '../../../shared/api/errors/ApiError.ts'
import {
  AppButton,
  AppDialog,
  ConfirmDialog,
  ControlledFormTextField,
  ControlledFormNumberField,
  InlineNotice,
  SectionCard,
  FormSection,
  useDirtyClose,
} from '../../../shared/ui/index.ts'
import { previewGameRoundScore } from '../../game-rounds/api/game-rounds-api.ts'
import { getGameRoundPreviewErrorCode } from '../model/game-round-preview-error.ts'
import {
  buildCompleteRoundInput,
  buildGameRoundPreviewRequest,
  buildGameRoundSummaryDefaultValues,
  gameRoundSummaryFormSchema,
  serializeGameRoundPreviewInput,
  type CompleteRoundInput,
  type GameRoundPostRoundAction,
  type GameRoundSummaryFormInput,
  type GameRoundSummaryFormValues,
} from '../model/game-round-summary-form.ts'
import {
  hasGameRoundDraftChanges,
  reconcileGameRoundDraft,
} from '../model/reconcile-game-round-draft.ts'
import { GameRoundContext } from './GameRoundContext.tsx'
import { GameRoundPostRoundSection } from './GameRoundPostRoundSection.tsx'
import { GameRoundPreviewSection, type GameRoundPreviewState } from './GameRoundPreviewSection.tsx'
import {
  GameRoundModifierHeading,
  GameRoundRuleGroupCard,
  GameRoundScoringInstanceCard,
} from './GameRoundResolutionFields.tsx'

type GameRoundDetails = components['schemas']['GameRoundDetailsDto']

interface GameRoundSummaryDialogProps {
  open: boolean
  activeRound: GameRoundDetails
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (input: {
    roundSummary: CompleteRoundInput
    postRoundAction: GameRoundPostRoundAction
  }) => void | Promise<void>
}

export function GameRoundSummaryDialog({ open, ...props }: GameRoundSummaryDialogProps) {
  return open ? <GameRoundSummaryDialogBody key={props.activeRound.roundId} {...props} /> : null
}

function GameRoundSummaryDialogBody({
  activeRound,
  isSubmitting,
  onClose,
  onSubmit,
}: Omit<GameRoundSummaryDialogProps, 'open'>) {
  const { t } = useTranslation()
  const formId = useId()
  const requestSequence = useRef(0)
  const defaultValues = useMemo(
    () => buildGameRoundSummaryDefaultValues(activeRound),
    [activeRound],
  )
  const { control, handleSubmit, reset, getValues } = useForm<
    GameRoundSummaryFormInput,
    unknown,
    GameRoundSummaryFormValues
  >({
    resolver: zodResolver(gameRoundSummaryFormSchema),
    defaultValues,
    mode: 'onChange',
  })
  const watchedValues = useWatch({ control })
  const [previewState, setPreviewState] = useState<GameRoundPreviewState>({
    status: 'incomplete',
    data: null,
    inputKey: null,
    errorCode: null,
  })
  const editingDefaults = useRef<GameRoundSummaryFormInput>(defaultValues)
  const close = useDirtyClose({
    // Watch updates synchronously with input; resolver-backed isDirty can lag a close click.
    dirty: hasGameRoundDraftChanges(defaultValues, getValues()),
    busy: isSubmitting,
    onClose,
  })
  const parsedValues = useMemo(
    () => gameRoundSummaryFormSchema.safeParse(watchedValues),
    [watchedValues],
  )
  const previewInput = useMemo(
    () => (parsedValues.success ? buildCompleteRoundInput(activeRound, parsedValues.data) : null),
    [activeRound, parsedValues],
  )
  const previewInputKey = useMemo(
    () =>
      previewInput
        ? `${activeRound.roundId}:${serializeGameRoundPreviewInput(previewInput)}`
        : null,
    [activeRound.roundId, previewInput],
  )
  const isPreviewFresh =
    previewState.status === 'success' &&
    previewState.inputKey === previewInputKey &&
    previewState.data?.roundVersion === activeRound.roundVersion &&
    Boolean(previewState.data.normalizedInputHash.trim())
  const scorePreview = isPreviewFresh ? previewState.data?.scoreDetails : null
  const displayedPreviewState: GameRoundPreviewState = !previewInputKey
    ? { status: 'incomplete', data: null, inputKey: null, errorCode: null }
    : previewState.inputKey !== previewInputKey
      ? { status: 'debouncing', data: previewState.data, inputKey: null, errorCode: null }
      : previewState

  useEffect(() => {
    if (editingDefaults.current === defaultValues) return
    const draft = reconcileGameRoundDraft(editingDefaults.current, getValues(), defaultValues)
    // Establish the refreshed baseline, then restore only actual user edits.
    reset(defaultValues)
    reset(draft, { keepDefaultValues: true })
    editingDefaults.current = defaultValues
  }, [defaultValues, getValues, reset])

  useEffect(() => {
    const sequence = ++requestSequence.current
    if (!previewInput || !previewInputKey) return
    const timer = window.setTimeout(() => {
      if (requestSequence.current !== sequence) return
      setPreviewState((current) => ({
        ...current,
        status: 'loading',
        inputKey: previewInputKey,
        errorCode: null,
      }))
      previewGameRoundScore(activeRound.roundId, buildGameRoundPreviewRequest(previewInput))
        .then((data) => {
          if (requestSequence.current !== sequence) return
          if (data.roundVersion !== activeRound.roundVersion) {
            setPreviewState({
              status: 'stale',
              data: null,
              inputKey: previewInputKey,
              errorCode: null,
            })
            return
          }
          if (!data.normalizedInputHash.trim()) {
            setPreviewState({
              status: 'error',
              data: null,
              inputKey: previewInputKey,
              errorCode: null,
            })
            return
          }
          setPreviewState({
            status: 'success',
            data,
            inputKey: previewInputKey,
            errorCode: null,
          })
        })
        .catch((error: unknown) => {
          if (requestSequence.current !== sequence) return
          const errorCode = getGameRoundPreviewErrorCode(error)
          setPreviewState({
            status:
              errorCode === 'game_round.stale_version' ||
              (error instanceof ApiError && error.status === 409)
                ? 'stale'
                : 'error',
            data: null,
            inputKey: previewInputKey,
            errorCode,
          })
        })
    }, 350)

    return () => window.clearTimeout(timer)
  }, [activeRound.roundId, activeRound.roundVersion, previewInput, previewInputKey])

  return (
    <>
      <AppDialog
        open
        onClose={isSubmitting ? undefined : close.requestClose}
        maxWidth="md"
        title={t('gameBoard.roundSummaryDialogTitle')}
        description={t('gameBoard.roundSummaryDialogDescription')}
        actions={
          <>
            <AppButton tone="ghost" onClick={close.requestClose} disabled={isSubmitting}>
              {t('common.actions.close')}
            </AppButton>
            <AppButton
              type="submit"
              form={formId}
              loading={isSubmitting}
              disabled={isSubmitting || !isPreviewFresh}
            >
              {t('gameBoard.roundSummarySubmit')}
            </AppButton>
          </>
        }
      >
        <Box
          component="form"
          id={formId}
          onSubmit={handleSubmit(async (values) => {
            const input = buildCompleteRoundInput(activeRound, values)
            if (
              previewState.status !== 'success' ||
              previewState.inputKey !==
                `${activeRound.roundId}:${serializeGameRoundPreviewInput(input)}` ||
              previewState.data?.roundVersion !== activeRound.roundVersion
            ) {
              return
            }
            await onSubmit({ roundSummary: input, postRoundAction: values.postRoundAction })
          })}
        >
          <Stack spacing={2}>
            <InlineNotice severity="info" variant="outlined">
              {t('gameBoard.roundSummaryFormulaHint', { scoreUnit: activeRound.baseScore })}
            </InlineNotice>

            <GameRoundContext activeRound={activeRound} />

            <FormSection title={t('gameBoard.roundSummaryResultTitle')}>
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                  <ControlledFormNumberField
                    control={control}
                    name="killsCount"
                    label={t('gameBoard.roundSummaryKills')}
                    min={0}
                  />
                  <ControlledFormNumberField
                    control={control}
                    name="bountyCount"
                    label={t('gameBoard.roundSummaryBounties')}
                    min={0}
                  />
                </Stack>
                <ControlledFormTextField
                  control={control}
                  name="notes"
                  label={t('gameBoard.roundSummaryNotes')}
                  multiline
                  minRows={2}
                  inputProps={{ maxLength: 2000 }}
                  helperText={t('gameBoard.roundSummaryNotesHint')}
                />
              </Stack>
            </FormSection>

            {defaultValues.ruleGroups.length > 0 ? (
              <FormSection title={t('gameBoard.roundSummaryRulesTitle')}>
                <Stack spacing={1.5}>
                  {defaultValues.ruleGroups.map((group, index) => (
                    <GameRoundRuleGroupCard
                      key={group.resolutionGroupId}
                      index={index}
                      control={control}
                    />
                  ))}
                </Stack>
              </FormSection>
            ) : null}

            {defaultValues.scoringInstances.length > 0 ? (
              <FormSection title={t('gameBoard.roundSummaryConditionsTitle')}>
                <Stack spacing={1.5}>
                  {defaultValues.scoringInstances.map((instance, index) => (
                    <GameRoundScoringInstanceCard
                      key={instance.modifierResultId}
                      index={index}
                      control={control}
                    />
                  ))}
                </Stack>
              </FormSection>
            ) : null}

            {defaultValues.automaticInstances.length > 0 ? (
              <FormSection title={t('gameBoard.roundSummaryAutomaticTitle')}>
                <Stack spacing={1.5}>
                  {defaultValues.automaticInstances.map((instance) => (
                    <SectionCard key={instance.modifierResultId} surface="inset">
                      <GameRoundModifierHeading
                        name={instance.modifierName}
                        index={instance.activationIndex}
                        count={instance.activationCount}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {t('gameBoard.roundSummaryAutomaticHint')}
                      </Typography>
                    </SectionCard>
                  ))}
                </Stack>
              </FormSection>
            ) : null}

            {activeRound.modifierResults.length === 0 ? (
              <SectionCard surface="inset">
                <Typography variant="body2" color="text.secondary">
                  {t('gameBoard.roundSummaryNoModifiers')}
                </Typography>
              </SectionCard>
            ) : null}

            <GameRoundPreviewSection state={displayedPreviewState} score={scorePreview} />
            <GameRoundPostRoundSection control={control} />
          </Stack>
        </Box>
      </AppDialog>

      <ConfirmDialog
        open={close.confirmOpen}
        title={t('gameBoard.roundSummaryCloseConfirmTitle')}
        description={t('gameBoard.roundSummaryCloseConfirmDescription')}
        confirmLabel={t('gameBoard.roundSummaryCloseConfirmAction')}
        cancelLabel={t('gameBoard.roundSummaryCloseConfirmCancel')}
        confirmTone="danger"
        onClose={close.keepEditing}
        onConfirm={close.discard}
      />
    </>
  )
}
