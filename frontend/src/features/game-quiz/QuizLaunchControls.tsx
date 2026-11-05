import { Box, Stack } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { API_ERROR_CODES } from '../../shared/api/errors/api-error-codes.ts'
import { AppButton, InlineNotice, HelpTooltip } from '../../shared/ui/index.ts'
import { QuizQuestionPickerDialog } from './QuizQuestionPickerDialog.tsx'

export function QuizLaunchStatus({
  open,
  modifierOrderingActive = false,
  error,
}: {
  open: boolean
  modifierOrderingActive?: boolean
  error: Error | null
}) {
  const { t } = useTranslation()
  const errorCode =
    error instanceof ApiError && error.details && typeof error.details === 'object'
      ? Reflect.get(error.details, 'code')
      : null
  const errorKey =
    errorCode === API_ERROR_CODES.gameQuizNoAvailableQuestions
      ? 'gameQuiz.noAvailableQuestionsError'
      : errorCode === API_ERROR_CODES.gameQuizModifierOrderingActive
        ? 'gameQuiz.modifierOrderingActive'
        : 'gameQuiz.actionError'
  return (
    <>
      {open || modifierOrderingActive ? (
        <InlineNotice severity="info">
          {t(
            modifierOrderingActive
              ? 'gameQuiz.modifierOrderingActive'
              : 'gameQuiz.waitForQuestionEnd',
          )}
        </InlineNotice>
      ) : null}
      {error ? (
        <InlineNotice
          severity={errorCode === API_ERROR_CODES.gameQuizNoAvailableQuestions ? 'info' : 'error'}
        >
          {t(errorKey)}
        </InlineNotice>
      ) : null}
    </>
  )
}

export function QuizLaunchControls({
  state,
  screenshot = false,
  questions,
  questionsLoading = false,
  questionsError = false,
  onRetryQuestions,
  isStarting,
  isLaunching = false,
  modifierOrderingActive = false,
  onAskNext,
  onAskSpecific,
}: {
  screenshot?: boolean
  state: { questionId: string; status: string } | null
  questions: readonly components['schemas']['AvailableGameQuizQuestionDto'][]
  questionsLoading?: boolean
  questionsError?: boolean
  onRetryQuestions?: () => void
  isStarting: boolean
  isLaunching?: boolean
  modifierOrderingActive?: boolean
  onAskNext: () => void
  onAskSpecific: (questionId: string) => void | Promise<unknown>
}) {
  const { t } = useTranslation()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [initialSelectedId, setInitialSelectedId] = useState<string | null>(null)
  const isOpen = state?.status === 'open'
  return (
    <>
      <Stack spacing={1}>
        <AppButton
          loading={isLaunching}
          disabled={
            isOpen || isStarting || modifierOrderingActive || (screenshot && questionsLoading)
          }
          onClick={() => {
            if (!screenshot) {
              onAskNext()
              return
            }
            setInitialSelectedId(
              questions.find(
                (question) => question.recommended && question.questionId !== state?.questionId,
              )?.questionId ?? null,
            )
            setPickerOpen(true)
          }}
        >
          <HelpTooltip placement="left" describeChild title={t('gameQuiz.managementHelp')}>
            <Box component="span" tabIndex={0}>
              {t(screenshot ? 'gameQuiz.nextScreenshot' : 'gameQuiz.nextQuestion')}
            </Box>
          </HelpTooltip>
        </AppButton>
        <AppButton
          tone="secondary"
          disabled={isOpen || isStarting || modifierOrderingActive}
          onClick={() => {
            setInitialSelectedId(null)
            setPickerOpen(true)
          }}
        >
          <HelpTooltip placement="left" describeChild title={t('gameQuiz.managementHelp')}>
            <Box component="span" tabIndex={0}>
              {t(screenshot ? 'gameQuiz.specificScreenshot' : 'gameQuiz.askSpecificQuestion')}
            </Box>
          </HelpTooltip>
        </AppButton>
      </Stack>
      <QuizQuestionPickerDialog
        key={`${pickerOpen}-${initialSelectedId}`}
        initialSelectedId={initialSelectedId}
        screenshot={screenshot}
        open={pickerOpen}
        questions={questions.filter((question) => question.questionId !== state?.questionId)}
        loading={questionsLoading}
        error={questionsError}
        launchDisabled={isStarting || isOpen || modifierOrderingActive}
        {...(modifierOrderingActive
          ? { unavailableReason: t('gameQuiz.modifierOrderingActive') }
          : isOpen
            ? { unavailableReason: t('gameQuiz.waitForQuestionEnd') }
            : {})}
        {...(onRetryQuestions ? { onRetry: onRetryQuestions } : {})}
        onClose={() => setPickerOpen(false)}
        onSelect={onAskSpecific}
      />
    </>
  )
}
