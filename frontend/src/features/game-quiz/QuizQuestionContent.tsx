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
import { QuizQuestionMetadata } from './QuizQuestionMetadata.tsx'
import { QuizTextBlock } from './QuizTextBlock.tsx'
import { useQuizCountdown } from './use-quiz-countdown.ts'

export function QuizQuestionContent({
  state,
  embedded,
  isSubmitting,
  answerDisabled,
  onSubmit,
  onDeadline,
  showQuestionText = true,
  showMetadata = true,
}: {
  state: CurrentGameQuizState
  embedded: boolean
  isSubmitting: boolean
  answerDisabled: boolean
  onSubmit: (questionSessionId: string, optionId: string) => void
  onDeadline: () => void
  showQuestionText?: boolean
  showMetadata?: boolean
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
      variant="h5"
      sx={{
        fontWeight: 700,
        lineHeight: 1.4,
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
                <Typography variant="h6" color="primary.light" sx={{ fontWeight: 700 }}>
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
                    variant="h3"
                    role="timer"
                    aria-live="off"
                    aria-label={t('gameQuiz.timeLeft', { seconds: countdown.secondsLeft })}
                    color={countdown.secondsLeft <= 10 ? 'error.light' : 'primary.light'}
                    sx={{
                      fontWeight: 700,
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
          {showMetadata ? (
            <QuizQuestionMetadata
              category={state.categoryName}
              {...(state.reward != null ? { reward: state.reward } : {})}
            />
          ) : null}
          {showQuestionText ? question : null}
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
          <Stack direction="row" gap={1.5} alignItems="center" justifyContent="space-between">
            {showMetadata ? (
              <QuizQuestionMetadata
                category={state.categoryName}
                {...(state.reward != null ? { reward: state.reward } : {})}
              />
            ) : null}
            {isOpen ? (
              <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 'auto' }}>
                <Typography variant="caption" color="text.secondary">
                  {t('gameQuiz.countdownLabel')}
                </Typography>
                <Typography
                  component="div"
                  role="timer"
                  aria-live="off"
                  aria-label={t('gameQuiz.timeLeft', { seconds: countdown.secondsLeft })}
                  variant="h4"
                  sx={{ fontVariantNumeric: 'tabular-nums', minWidth: '5ch' }}
                  color={countdown.secondsLeft <= 10 ? 'error.light' : 'primary.light'}
                >
                  {clock}
                </Typography>
              </Box>
            ) : showQuestionText ? (
              <StatusBadge
                color={state.status === 'closed' ? 'success' : 'default'}
                label={t(`gameQuiz.status.${state.status}`)}
              />
            ) : null}
          </Stack>
          {isOpen ? (
            <TaskProgress
              variant="determinate"
              value={countdown.progress}
              aria-label={t('gameQuiz.countdownLabel')}
            />
          ) : null}
          {showQuestionText ? question : null}
        </>
      )}
      <Box sx={{ containerType: 'inline-size' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: 0.75,
            ...(state.options.every((option) => option.text.length <= 100)
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
                tone="secondary"
                density="compact"
                appearance="inset"
                marker={optionMarker(index)}
                data-quiz-result={resultKind}
                aria-label={[
                  option.text,
                  resultKind === 'correct' ? t('gameQuiz.answerCorrectStatus') : null,
                  isSelected ? t('gameQuiz.yourChoice') : null,
                  !isOpen && result ? `${result.answerCount} · ${result.percentage}%` : null,
                ]
                  .filter(Boolean)
                  .join(', ')}
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
                <span>{option.text}</span>
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
      {!embedded && !isOpen && state.correctOptionId ? (
        <QuizTextBlock label={t('gameQuiz.correctAnswerHeading')} inline>
          {state.options.find((option) => option.optionId === state.correctOptionId)?.text}
        </QuizTextBlock>
      ) : null}
      {isOpen && hasAnswered ? (
        <InlineNotice appearance="textured" icon={false} severity="info">
          {t('gameQuiz.answerAccepted')}
        </InlineNotice>
      ) : null}
      {isOpen && isSubmitting && !hasAnswered ? (
        <InlineNotice appearance="textured" icon={false} severity="info">
          {t('gameQuiz.answerSending')}
        </InlineNotice>
      ) : null}
      {isOpen && countdown.secondsLeft === 0 && !hasAnswered ? (
        <InlineNotice appearance="textured" icon={false} severity="info">
          {t('gameQuiz.waitingForResults')}
        </InlineNotice>
      ) : null}
      {!isOpen && state.status === 'closed' && state.mySelectedOptionId ? (
        <InlineNotice
          appearance="textured"
          icon={false}
          severity={state.myIsCorrect ? 'success' : 'error'}
        >
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
