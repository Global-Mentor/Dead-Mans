import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import {
  HelpTooltip,
  InlineNotice,
  ItemCard,
  NativeDisclosure,
  StatusBadge,
} from '../../shared/ui/index.ts'

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
  const incorrectCount = questionSession.submissions.length - correctCount
  const sortedSubmissions = [...questionSession.submissions].sort(
    (left, right) =>
      Number(right.isCorrect) - Number(left.isCorrect) ||
      left.displayName.localeCompare(right.displayName, i18n.resolvedLanguage),
  )

  return (
    <ItemCard sx={{ overflowWrap: 'anywhere' }}>
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
            {questionSession.categoryName} ·{' '}
            {t('gameQuiz.rewardLabel', { reward: questionSession.reward })}
            {questionSession.status !== 'closed'
              ? ` · ${t(`gameQuiz.status.${questionSession.status}`)}`
              : ''}
          </Typography>
          <HelpTooltip
            describeChild
            title={new Date(
              questionSession.closedAtUtc ?? questionSession.askedAtUtc,
            ).toLocaleString(i18n.resolvedLanguage)}
          >
            <Typography
              component="time"
              tabIndex={0}
              dateTime={questionSession.closedAtUtc ?? questionSession.askedAtUtc}
              variant="caption"
              color="text.secondary"
              sx={{ flexShrink: 0 }}
            >
              {new Date(questionSession.closedAtUtc ?? questionSession.askedAtUtc).toLocaleString(
                i18n.resolvedLanguage,
                { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
              )}
            </Typography>
          </HelpTooltip>
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
          <InlineNotice
            severity={own.isCorrect ? 'success' : 'error'}
            variant="outlined"
            icon={false}
            appearance="inline"
          >
            {t('gameQuiz.answerLabel', { answer: own.selectedOptionText })}
            {' · '}
            {own.isCorrect
              ? t('gameQuiz.resultCorrect', { points: own.awardedPoints })
              : t('gameQuiz.resultWrong')}
          </InlineNotice>
        ) : null}
        {questionSession.status === 'closed' ? (
          <NativeDisclosure
            summary={
              <>
                {t('gameQuiz.answerResultsSummary', {
                  correct: correctCount,
                  incorrect: incorrectCount,
                })}
              </>
            }
          >
            <Stack component="ul" spacing={0.5} sx={{ m: 0, mt: 0.5, p: 0, listStyle: 'none' }}>
              {sortedSubmissions.map((submission) => (
                <ItemCard
                  component="li"
                  key={submission.userId}
                  data-answer-result={submission.isCorrect ? 'correct' : 'incorrect'}
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
                    <StatusBadge
                      size="small"
                      color={submission.isCorrect ? 'success' : 'error'}
                      label={t(
                        submission.isCorrect
                          ? 'gameQuiz.answerCorrectStatus'
                          : 'gameQuiz.answerWrongStatus',
                      )}
                      sx={{ flexShrink: 0 }}
                    />
                  </Stack>
                </ItemCard>
              ))}
            </Stack>
          </NativeDisclosure>
        ) : null}
      </Stack>
    </ItemCard>
  )
}
