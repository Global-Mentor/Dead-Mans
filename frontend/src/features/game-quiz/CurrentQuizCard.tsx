import { Alert, Chip, LinearProgress, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import type { CurrentGameQuizState } from '../../shared/api/contracts/index.ts'
import { AppButton, FormSelect, SectionCard, SectionHeader } from '../../shared/ui/index.ts'

type AvailableQuestion = components['schemas']['AvailableGameQuizQuestionDto']

type CurrentQuizCardProps = {
  state: CurrentGameQuizState | null
  canManage: boolean
  questions: readonly AvailableQuestion[]
  isSubmitting: boolean
  isStarting: boolean
  error: Error | null
  onSubmit: (questionSessionId: string, optionId: string) => void
  onAskNext: () => void
  onAskSpecific: (questionId: string) => void
  onDeadline: () => void
}

export function CurrentQuizCard({
  state,
  canManage,
  questions,
  isSubmitting,
  isStarting,
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
  const [selectedQuestionId, setSelectedQuestionId] = useState('')
  const usedQuestionIds = useMemo(() => new Set(state ? [state.questionId] : []), [state])
  const selectableQuestions = questions.filter(
    (question) => !usedQuestionIds.has(question.questionId),
  )
  const validSelectedQuestionId = selectableQuestions.some(
    (question) => question.questionId === selectedQuestionId,
  )
    ? selectedQuestionId
    : ''
  const isOpen = state?.status === 'open'
  const hasAnswered = state?.mySelectedOptionId != null

  return (
    <SectionCard sx={{ mt: 1 }}>
      <SectionHeader
        title={state ? t('gameQuiz.currentTitle') : t('gameQuiz.waitingTitle')}
        description={state ? t('gameQuiz.currentDescription') : t('gameQuiz.waitingDescription')}
        actions={
          canManage ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <AppButton size="small" disabled={isOpen || isStarting} onClick={onAskNext}>
                {t('gameQuiz.nextQuestion')}
              </AppButton>
              <FormSelect
                value={validSelectedQuestionId}
                label={t('gameQuiz.chooseQuestion')}
                options={selectableQuestions.map((question) => ({
                  value: question.questionId,
                  label: question.text,
                }))}
                disabled={isOpen || isStarting}
                onChange={(value) => setSelectedQuestionId(String(value))}
              />
              <AppButton
                size="small"
                tone="secondary"
                disabled={isOpen || isStarting || validSelectedQuestionId === ''}
                onClick={() => onAskSpecific(validSelectedQuestionId)}
              >
                {t('gameQuiz.startSelected')}
              </AppButton>
            </Stack>
          ) : null
        }
      />

      {error ? (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {t('gameQuiz.actionError')}
        </Alert>
      ) : null}
      {!state ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {t('gameQuiz.noCurrentQuestion')}
        </Typography>
      ) : (
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label={state.categoryName} size="small" />
            {isOpen ? (
              <Chip
                color="warning"
                label={t('gameQuiz.timeLeft', { seconds: countdown.secondsLeft })}
              />
            ) : (
              <Chip
                color={state.status === 'closed' ? 'success' : 'default'}
                label={t(`gameQuiz.status.${state.status}`)}
              />
            )}
            {!isOpen ? <Chip label={t('gameQuiz.rewardLabel', { reward: state.reward })} /> : null}
          </Stack>
          {isOpen ? <LinearProgress variant="determinate" value={countdown.progress} /> : null}
          <Typography variant="h6">{state.text}</Typography>
          <Stack spacing={1}>
            {state.options.map((option) => {
              const isSelected = state.mySelectedOptionId === option.optionId
              const isCorrect = state.correctOptionId === option.optionId
              const result = state.optionResults?.find((item) => item.optionId === option.optionId)
              return (
                <AppButton
                  key={option.optionId}
                  tone={!isOpen && isCorrect ? 'secondary' : 'ghost'}
                  disabled={!isOpen || hasAnswered || isSubmitting}
                  onClick={() => onSubmit(state.questionSessionId, option.optionId)}
                  sx={{ justifyContent: 'space-between', textAlign: 'left' }}
                >
                  <span>
                    {option.text}
                    {isSelected ? ` · ${t('gameQuiz.yourChoice')}` : ''}
                  </span>
                  {!isOpen && result ? (
                    <span>
                      {result.answerCount} · {result.percentage}%
                    </span>
                  ) : null}
                </AppButton>
              )
            })}
          </Stack>
          {isOpen && hasAnswered ? (
            <Alert severity="info">{t('gameQuiz.answerAccepted')}</Alert>
          ) : null}
          {!isOpen && state.status === 'closed' && state.mySelectedOptionId ? (
            <Alert severity={state.myIsCorrect ? 'success' : 'error'}>
              {state.myIsCorrect
                ? t('gameQuiz.resultCorrect', { points: state.myAwardedPoints ?? 0 })
                : t('gameQuiz.resultWrong')}
            </Alert>
          ) : null}
        </Stack>
      )}
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
