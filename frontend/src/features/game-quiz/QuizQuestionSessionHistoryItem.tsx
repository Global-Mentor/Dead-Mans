import { Alert, Box, Chip, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'

type QuestionSession = components['schemas']['GameHistoryQuizQuestionSessionItemDto']

export function QuizQuestionSessionHistoryItem({
  questionSession,
  currentUserId,
}: {
  questionSession: QuestionSession
  currentUserId: string | null
}) {
  const { t, i18n } = useTranslation()
  const own = questionSession.submissions.find((item) => item.userId === currentUserId)
  const correctOption = questionSession.options.find(
    (option) => option.optionId === questionSession.correctOptionId,
  )
  const correctCount = questionSession.submissions.filter((item) => item.isCorrect).length

  return (
    <Box sx={{ px: 2, py: 1.5 }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption">
            {t('gameQuiz.questionLabel', { order: questionSession.questionCode })}
          </Typography>
          <Chip size="small" label={t(`gameQuiz.status.${questionSession.status}`)} />
          <Chip size="small" label={questionSession.categoryName} />
          <Chip
            size="small"
            label={t('gameQuiz.rewardLabel', { reward: questionSession.reward })}
          />
          <Typography variant="caption" color="text.secondary">
            {new Date(questionSession.closedAtUtc ?? questionSession.askedAtUtc).toLocaleString(
              i18n.resolvedLanguage,
            )}
          </Typography>
        </Stack>
        <Typography variant="body2" fontWeight={600}>
          {questionSession.questionText}
        </Typography>
        {correctOption ? (
          <Typography variant="body2">
            {t('gameQuiz.correctAnswerLabel', { answer: correctOption.text })}
          </Typography>
        ) : null}
        {own ? (
          <Alert severity={own.isCorrect ? 'success' : 'error'}>
            {t('gameQuiz.answerLabel', { answer: own.selectedOptionText })}
            {' · '}
            {own.isCorrect
              ? t('gameQuiz.resultCorrect', { points: own.awardedPoints })
              : t('gameQuiz.resultWrong')}
          </Alert>
        ) : null}
        {questionSession.status === 'closed' ? (
          <details>
            <summary>
              {t('gameQuiz.answerStats', {
                correct: correctCount,
                attempts: questionSession.submissions.length,
              })}
            </summary>
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              {questionSession.submissions.map((submission) => (
                <Typography key={submission.userId} variant="body2">
                  {submission.displayName}: {submission.selectedOptionText}
                  {' · '}
                  {t('gameQuiz.totalPoints', { points: submission.awardedPoints })}
                </Typography>
              ))}
            </Stack>
          </details>
        ) : null}
      </Stack>
    </Box>
  )
}
