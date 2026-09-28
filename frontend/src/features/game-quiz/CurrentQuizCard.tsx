import { Box, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import type { CurrentGameQuizState } from '../../shared/api/contracts/index.ts'
import { API_ERROR_CODES } from '../../shared/api/errors/api-error-codes.ts'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import {
  AppButton,
  InlineNotice,
  SectionCard,
  SectionHeader,
  SelectionAction,
  StatusBadge,
  TaskProgress,
} from '../../shared/ui/index.ts'
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
  const countdown = useQuizCountdown(
    state?.status === 'open' ? state.askedAtUtc : null,
    state?.status === 'open' ? state.closesAtUtc : null,
    onDeadline,
  )
  const [questionPickerOpen, setQuestionPickerOpen] = useState(false)
  const usedQuestionIds = useMemo(() => new Set(state ? [state.questionId] : []), [state])
  const selectableQuestions = questions.filter(
    (question) => !usedQuestionIds.has(question.questionId),
  )
  const isOpen = state?.status === 'open'
  const hasAnswered = state?.mySelectedOptionId != null
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
        <Stack spacing={1.25} sx={{ mt: embedded ? 0 : 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <StatusBadge label={state.categoryName} size="small" />
            {isOpen ? (
              <StatusBadge
                color="warning"
                label={t('gameQuiz.timeLeft', { seconds: countdown.secondsLeft })}
              />
            ) : (
              <StatusBadge
                color={state.status === 'closed' ? 'success' : 'default'}
                label={t(`gameQuiz.status.${state.status}`)}
              />
            )}
            {!isOpen ? (
              <StatusBadge label={t('gameQuiz.rewardLabel', { reward: state.reward })} />
            ) : null}
          </Stack>
          {isOpen ? <TaskProgress variant="determinate" value={countdown.progress} /> : null}
          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              fontWeight: 700,
              lineHeight: 1.35,
              overflowWrap: 'anywhere',
            }}
          >
            {state.text}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 1,
            }}
          >
            {state.options.map((option) => {
              const isSelected = state.mySelectedOptionId === option.optionId
              const isCorrect = state.correctOptionId === option.optionId
              const resultKind = !isOpen
                ? isCorrect
                  ? 'correct'
                  : isSelected
                    ? 'selected-wrong'
                    : undefined
                : undefined
              const result = state.optionResults?.find((item) => item.optionId === option.optionId)
              return (
                <SelectionAction
                  key={option.optionId}
                  tone="ghost"
                  data-quiz-result={resultKind}
                  disabled={
                    !isOpen ||
                    countdown.secondsLeft === 0 ||
                    hasAnswered ||
                    isSubmitting ||
                    answerDisabled
                  }
                  onClick={() => onSubmit(state.questionSessionId, option.optionId)}
                  selected={isSelected}
                  outcome={
                    resultKind === 'correct'
                      ? 'success'
                      : resultKind === 'selected-wrong'
                        ? 'error'
                        : undefined
                  }
                >
                  <span>
                    {option.text}
                    {isSelected ? ` · ${t('gameQuiz.yourChoice')}` : ''}
                    {resultKind === 'correct' ? (
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{ display: 'block', fontWeight: 700 }}
                      >
                        {t('gameQuiz.answerCorrectStatus')}
                      </Typography>
                    ) : null}
                  </span>
                  {!isOpen && result ? (
                    <span>
                      {result.answerCount} · {result.percentage}%
                    </span>
                  ) : null}
                </SelectionAction>
              )
            })}
          </Box>
          {isOpen && hasAnswered ? (
            <InlineNotice severity="info">{t('gameQuiz.answerAccepted')}</InlineNotice>
          ) : null}
          {!isOpen && state.status === 'closed' && state.mySelectedOptionId ? (
            <InlineNotice severity={state.myIsCorrect ? 'success' : 'error'}>
              {state.myIsCorrect
                ? t('gameQuiz.resultCorrect', { points: state.myAwardedPoints ?? 0 })
                : t('gameQuiz.resultWrong')}
            </InlineNotice>
          ) : null}
        </Stack>
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

function useQuizCountdown(
  askedAtUtc: string | null,
  closesAtUtc: string | null,
  onDeadline: () => void,
) {
  const [now, setNow] = useState(() => Date.now())
  const notifiedDeadline = useRef<string | null>(null)
  const askedAt = askedAtUtc ? new Date(askedAtUtc).getTime() : null
  const closesAt = closesAtUtc ? new Date(closesAtUtc).getTime() : null
  const secondsLeft = closesAt == null ? 0 : Math.max(0, Math.ceil((closesAt - now) / 1000))
  const duration = askedAt == null || closesAt == null ? 0 : Math.max(1, closesAt - askedAt)
  const progress =
    closesAt == null ? 0 : Math.min(100, Math.max(0, ((closesAt - now) / duration) * 100))

  useEffect(() => {
    if (!closesAtUtc) {
      return
    }
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [closesAtUtc])

  useEffect(() => {
    if (closesAtUtc && secondsLeft === 0 && notifiedDeadline.current !== closesAtUtc) {
      notifiedDeadline.current = closesAtUtc
      onDeadline()
    }
  }, [closesAtUtc, onDeadline, secondsLeft])

  return { progress, secondsLeft }
}
