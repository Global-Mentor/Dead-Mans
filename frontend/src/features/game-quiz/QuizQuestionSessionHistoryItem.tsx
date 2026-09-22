import { Alert, Box, Chip, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'

type QuestionSession = components['schemas']['GameHistoryQuizQuestionSessionItemDto']

export function QuizQuestionSessionHistoryItem({
  questionSession,
  currentUserId,
  alternate = false,
}: {
  questionSession: QuestionSession
  currentUserId: string | null
  alternate?: boolean
}) {
  const { t, i18n } = useTranslation()
  const own = questionSession.submissions.find((item) => item.userId === currentUserId)
  const correctOption = questionSession.options.find(
    (option) => option.optionId === questionSession.correctOptionId,
  )
  const correctCount = questionSession.submissions.filter((item) => item.isCorrect).length
  const incorrectCount = questionSession.submissions.length - correctCount
  const sortedSubmissions = [...questionSession.submissions].sort(
    (left, right) =>
      Number(right.isCorrect) - Number(left.isCorrect) ||
      left.displayName.localeCompare(right.displayName, i18n.resolvedLanguage),
  )

  return (
    <Box
      data-history-tone={alternate ? 'light' : 'dark'}
      sx={(theme) => ({
        px: 1.5,
        py: 1.25,
        overflowWrap: 'anywhere',
        backgroundColor: alternate
          ? alpha(theme.palette.common.white, 0.055)
          : alpha(theme.palette.common.black, 0.22),
      })}
    >
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
            {questionSession.categoryName} ·{' '}
            {t('gameQuiz.rewardLabel', { reward: questionSession.reward })}
            {questionSession.status !== 'closed'
              ? ` · ${t(`gameQuiz.status.${questionSession.status}`)}`
              : ''}
          </Typography>
          <Typography
            component="time"
            dateTime={questionSession.closedAtUtc ?? questionSession.askedAtUtc}
            variant="caption"
            color="text.secondary"
            sx={{ flexShrink: 0 }}
            title={new Date(
              questionSession.closedAtUtc ?? questionSession.askedAtUtc,
            ).toLocaleString(i18n.resolvedLanguage)}
          >
            {new Date(questionSession.closedAtUtc ?? questionSession.askedAtUtc).toLocaleString(
              i18n.resolvedLanguage,
              { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
            )}
          </Typography>
        </Stack>
        <Typography variant="body1" fontWeight={700} sx={{ lineHeight: 1.35 }}>
          {questionSession.questionText}
        </Typography>
        {correctOption ? (
          <Typography variant="body2" color="success.light">
            {t('gameQuiz.correctAnswerLabel', { answer: correctOption.text })}
          </Typography>
        ) : null}
        {own ? (
          <Alert
            severity={own.isCorrect ? 'success' : 'error'}
            variant="outlined"
            icon={false}
            sx={{
              p: 0,
              border: 0,
              background: 'none',
              '& .MuiAlert-message': { p: 0, fontSize: '0.78rem', lineHeight: 1.35 },
            }}
          >
            {t('gameQuiz.answerLabel', { answer: own.selectedOptionText })}
            {' · '}
            {own.isCorrect
              ? t('gameQuiz.resultCorrect', { points: own.awardedPoints })
              : t('gameQuiz.resultWrong')}
          </Alert>
        ) : null}
        {questionSession.status === 'closed' ? (
          <Box
            component="details"
            sx={{
              '&[open] > summary': { color: 'text.primary' },
            }}
          >
            <Typography
              component="summary"
              variant="caption"
              color="text.secondary"
              sx={{
                cursor: 'pointer',
                py: 0.75,
                fontWeight: 700,
                minHeight: 32,
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                },
              }}
            >
              {t('gameQuiz.answerResultsSummary', {
                correct: correctCount,
                incorrect: incorrectCount,
              })}
            </Typography>
            <Stack component="ul" spacing={0.5} sx={{ m: 0, mt: 0.5, p: 0, listStyle: 'none' }}>
              {sortedSubmissions.map((submission) => (
                <Box
                  component="li"
                  key={submission.userId}
                  data-answer-result={submission.isCorrect ? 'correct' : 'incorrect'}
                  sx={(theme) => {
                    const tone = submission.isCorrect
                      ? theme.palette.success.main
                      : theme.palette.error.main
                    return {
                      px: 0.75,
                      py: 0.5,
                      border: '1px solid',
                      borderColor: alpha(tone, 0.55),
                      backgroundColor: alpha(tone, 0.06),
                    }
                  }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="flex-start">
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere', lineHeight: 1.45 }}
                    >
                      <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {submission.displayName}:
                      </Box>{' '}
                      {submission.selectedOptionText}
                    </Typography>
                    <Chip
                      size="small"
                      color={submission.isCorrect ? 'success' : 'error'}
                      label={t(
                        submission.isCorrect
                          ? 'gameQuiz.answerCorrectStatus'
                          : 'gameQuiz.answerWrongStatus',
                      )}
                      sx={{ height: 18, fontSize: '0.62rem', flexShrink: 0 }}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </Box>
  )
}
