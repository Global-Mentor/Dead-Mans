import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { CurrentGameQuizState } from '../../shared/api/contracts/index.ts'
import { RoundBriefingPanel } from '../../shared/game-ui/index.ts'
import {
  ImageFrame,
  InlineNotice,
  SelectionAction,
  StatusBadge,
  TaskProgress,
} from '../../shared/ui/index.ts'
import { useQuizCountdown } from './use-quiz-countdown.ts'

export function QuizQuestionContent({
  state,
  embedded,
  isSubmitting,
  answerDisabled,
  onSubmit,
  onDeadline,
}: {
  state: CurrentGameQuizState
  embedded: boolean
  isSubmitting: boolean
  answerDisabled: boolean
  onSubmit: (questionSessionId: string, optionId: string) => void
  onDeadline: () => void
}) {
  const { t } = useTranslation()
  const isOpen = state.status === 'open'
  const hasAnswered = state.mySelectedOptionId != null
  const countdown = useQuizCountdown(
    isOpen ? state.askedAtUtc : null,
    isOpen ? state.closesAtUtc : null,
    onDeadline,
  )
  const clock = `${Math.floor(countdown.secondsLeft / 60)
    .toString()
    .padStart(2, '0')}:${(countdown.secondsLeft % 60).toString().padStart(2, '0')}`
  const question = (
    <Typography
      component="h3"
      variant="h6"
      sx={{
        fontSize: embedded ? '1.375rem' : { xs: '1.25rem', sm: '1.5rem' },
        fontWeight: 700,
        lineHeight: embedded ? 1.4 : 1.35,
        overflowWrap: 'anywhere',
        ...(embedded ? { py: 1, whiteSpace: 'pre-wrap' } : {}),
      }}
    >
      {state.text}
    </Typography>
  )

  return (
    <Stack spacing={1.25} sx={{ mt: embedded ? 0 : 1.5 }}>
      {embedded ? (
        <RoundBriefingPanel
          contentEmphasis="strong"
          header={
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                <ImageFrame
                  src="/brand/deadmans-monogram.svg"
                  decorative
                  alt=""
                  loadingLabel=""
                  errorLabel=""
                  sizing="fill"
                  loading="eager"
                  sx={{ width: 56, height: 56, flexShrink: 0 }}
                />
                <Typography color="primary.light" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                  {t('gameQuiz.questionHeading')}
                </Typography>
              </Stack>
              {isOpen ? (
                <Box sx={{ textAlign: 'right', minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {t('gameQuiz.countdownLabel')}
                  </Typography>
                  <Typography
                    component="div"
                    role="timer"
                    aria-live="off"
                    aria-label={t('gameQuiz.timeLeft', { seconds: countdown.secondsLeft })}
                    color={countdown.secondsLeft <= 10 ? 'error.light' : 'primary.light'}
                    sx={{
                      fontSize: '1.875rem',
                      fontWeight: 700,
                      lineHeight: 1.1,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {clock}
                  </Typography>
                </Box>
              ) : (
                <StatusBadge label={t(`gameQuiz.status.${state.status}`)} />
              )}
            </Stack>
          }
        >
          {question}
          {isOpen ? (
            <Box sx={{ pt: 0.5, pb: 1 }}>
              <TaskProgress
                variant="determinate"
                value={countdown.progress}
                aria-label={t('gameQuiz.countdownLabel')}
              />
            </Box>
          ) : null}
        </RoundBriefingPanel>
      ) : (
        <>
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
          {question}
        </>
      )}
      <Box sx={{ containerType: 'inline-size' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: embedded
              ? 'minmax(0, 1fr)'
              : { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
            gap: embedded ? 0.75 : 1,
            ...(embedded && state.options.every((option) => option.text.length <= 100)
              ? {
                  '@container (min-width: 440px)': {
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  },
                }
              : {}),
          }}
        >
          {state.options.map((option, index) => {
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
                tone={embedded ? 'secondary' : 'ghost'}
                density={embedded ? 'compact' : 'standard'}
                appearance={embedded ? 'inset' : 'standard'}
                marker={embedded ? optionMarker(index) : undefined}
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
  )
}

function optionMarker(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : `${index + 1}`
}
