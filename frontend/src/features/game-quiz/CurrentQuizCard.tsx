import { Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import type { CurrentGameQuizState } from '../../shared/api/contracts/index.ts'
import { API_ERROR_CODES } from '../../shared/api/errors/api-error-codes.ts'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { AppButton, InlineNotice, SectionCard, SectionHeader } from '../../shared/ui/index.ts'
import { QuizQuestionContent } from './QuizQuestionContent.tsx'
import { QuizQuestionPickerDialog } from './QuizQuestionPickerDialog.tsx'

type AvailableQuestion = components['schemas']['AvailableGameQuizQuestionDto']

type CurrentQuizCardProps = {
  state: CurrentGameQuizState | null
  canManage: boolean
  questions: readonly AvailableQuestion[]
  questionsLoading?: boolean
  questionsError?: boolean
  onRetryQuestions?: () => void
  isSubmitting: boolean
  answerDisabled?: boolean
  isStarting: boolean
  modifierOrderingActive?: boolean
  embedded?: boolean
  error: Error | null
  onSubmit: (questionSessionId: string, optionId: string) => void
  onAskNext?: () => void
  onAskSpecific?: (questionId: string) => void
  onDeadline: () => void
}

export function CurrentQuizCard({
  state,
  canManage,
  questions,
  questionsLoading = false,
  questionsError = false,
  onRetryQuestions,
  isSubmitting,
  answerDisabled = false,
  isStarting,
  modifierOrderingActive = false,
  embedded = false,
  error,
  onSubmit,
  onAskNext,
  onAskSpecific,
  onDeadline,
}: CurrentQuizCardProps) {
  const { t } = useTranslation()
  const [questionPickerOpen, setQuestionPickerOpen] = useState(false)
  const usedQuestionIds = useMemo(() => new Set(state ? [state.questionId] : []), [state])
  const selectableQuestions = questions.filter(
    (question) => !usedQuestionIds.has(question.questionId),
  )
  const isOpen = state?.status === 'open'
  const description = !state
    ? t('gameQuiz.waitingDescription')
    : isOpen
      ? t('gameQuiz.currentDescription')
      : state.status === 'closed'
        ? t('gameQuiz.closedDescription')
        : t('gameQuiz.skippedDescription')
  const errorCode =
    error instanceof ApiError && error.details && typeof error.details === 'object'
      ? Reflect.get(error.details, 'code')
      : null
  const errorMessageKey =
    errorCode === API_ERROR_CODES.gameQuizModifierOrderingActive
      ? 'gameQuiz.modifierOrderingActive'
      : errorCode === API_ERROR_CODES.gameQuizNoAvailableQuestions
        ? 'gameQuiz.noAvailableQuestionsError'
        : 'gameQuiz.actionError'

  return (
    <SectionCard
      component={embedded ? 'div' : 'section'}
      sx={{
        minWidth: 0,
        p: embedded ? 0 : { xs: 1.5, sm: 2 },
        ...(embedded ? { border: 0, backgroundColor: 'transparent', backgroundImage: 'none' } : {}),
      }}
    >
      {!embedded ? (
        <SectionHeader
          title={state ? t('gameQuiz.currentTitle') : t('gameQuiz.waitingTitle')}
          description={description}
        />
      ) : null}

      {canManage && onAskNext && onAskSpecific ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ sm: 'stretch' }}
          sx={(theme) => ({
            mt: 1.5,
            pb: 1.5,
            borderBottom: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.2),
          })}
        >
          <AppButton
            size="small"
            disabled={isOpen || isStarting || modifierOrderingActive}
            onClick={onAskNext}
            sx={{ flexShrink: 0, whiteSpace: 'normal' }}
          >
            {t('gameQuiz.nextQuestion')}
          </AppButton>
          <AppButton
            size="small"
            tone="secondary"
            disabled={isOpen || isStarting || modifierOrderingActive}
            onClick={() => setQuestionPickerOpen(true)}
          >
            {t('gameQuiz.askSpecificQuestion')}
          </AppButton>
        </Stack>
      ) : null}

      {canManage && modifierOrderingActive ? (
        <InlineNotice severity="info" sx={{ mt: 1.5 }}>
          {t('gameQuiz.modifierOrderingActive')}
        </InlineNotice>
      ) : null}

      {error ? (
        <InlineNotice
          severity={errorCode === API_ERROR_CODES.gameQuizNoAvailableQuestions ? 'info' : 'error'}
          sx={{ mt: 1.5 }}
        >
          {t(errorMessageKey)}
        </InlineNotice>
      ) : null}
      {!state ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {t('gameQuiz.noCurrentQuestion')}
        </Typography>
      ) : (
        <QuizQuestionContent
          key={state.questionSessionId}
          state={state}
          embedded={embedded}
          isSubmitting={isSubmitting}
          answerDisabled={answerDisabled}
          onSubmit={onSubmit}
          onDeadline={onDeadline}
        />
      )}
      {canManage && onAskSpecific ? (
        <QuizQuestionPickerDialog
          open={questionPickerOpen}
          questions={selectableQuestions}
          busy={isStarting || isOpen || modifierOrderingActive}
          loading={questionsLoading}
          error={questionsError}
          {...(onRetryQuestions ? { onRetry: onRetryQuestions } : {})}
          onClose={() => setQuestionPickerOpen(false)}
          onSelect={onAskSpecific}
        />
      ) : null}
    </SectionCard>
  )
}
