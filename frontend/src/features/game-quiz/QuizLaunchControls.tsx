import { Box, Stack } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { API_ERROR_CODES } from '../../shared/api/errors/api-error-codes.ts'
import { AppButton, InlineNotice, HelpTooltip } from '../../shared/ui/index.ts'
import { QuizQuestionPickerDialog } from './QuizQuestionPickerDialog.tsx'

export function QuizLaunchControls({
  state,
  questions,
  questionsLoading = false,
  questionsError = false,
  onRetryQuestions,
  isStarting,
  isLaunching = false,
  modifierOrderingActive = false,
  error,
  onAskNext,
  onAskSpecific,
}: {
  state: { questionId: string; status: string } | null
  questions: readonly components['schemas']['AvailableGameQuizQuestionDto'][]
  questionsLoading?: boolean
  questionsError?: boolean
  onRetryQuestions?: () => void
  isStarting: boolean
  isLaunching?: boolean
  modifierOrderingActive?: boolean
  error: Error | null
  onAskNext: () => void
  onAskSpecific: (questionId: string) => void | Promise<unknown>
}) {
  const { t } = useTranslation()
  const [pickerOpen, setPickerOpen] = useState(false)
  const isOpen = state?.status === 'open'
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
      <Stack spacing={1}>
        {isOpen || modifierOrderingActive ? (
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
        <AppButton
          loading={isLaunching}
          disabled={isOpen || isStarting || modifierOrderingActive}
          onClick={onAskNext}
        >
          <HelpTooltip placement="left" describeChild title={t('gameQuiz.managementHelp')}>
            <Box component="span" tabIndex={0}>
              {t('gameQuiz.nextQuestion')}
            </Box>
          </HelpTooltip>
        </AppButton>
        <AppButton
          tone="secondary"
          disabled={isOpen || isStarting || modifierOrderingActive}
          onClick={() => setPickerOpen(true)}
        >
          <HelpTooltip placement="left" describeChild title={t('gameQuiz.managementHelp')}>
            <Box component="span" tabIndex={0}>
              {t('gameQuiz.askSpecificQuestion')}
            </Box>
          </HelpTooltip>
        </AppButton>
      </Stack>
      <QuizQuestionPickerDialog
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
