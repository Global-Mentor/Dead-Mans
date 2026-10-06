import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import {
  HelpTooltip,
  InlineNotice,
  ItemCard,
  NativeDisclosure,
  StatusBadge,
  SelectionAction,
} from '../../shared/ui/index.ts'

import { QuizQuestionMetadata } from './QuizQuestionMetadata.tsx'
import { QuizTextBlock } from './QuizTextBlock.tsx'

type QuestionSession = components['schemas']['GameHistoryQuizQuestionSessionItemDto']

export function QuizQuestionSessionHistoryItem({
  questionSession,
  currentUserId,
  showQuestionText = true,
  framed = true,
  showOptions = false,
  resultsOnly = false,
  showMetadata = true,
}: {
  questionSession: QuestionSession
  currentUserId: string | null
  showQuestionText?: boolean
  framed?: boolean
  showOptions?: boolean
  resultsOnly?: boolean
  showMetadata?: boolean
}) {
  const { t, i18n } = useTranslation()
  const own = questionSession.submissions.find((item) => item.userId === currentUserId)
  const correctOption = questionSession.options.find(
    (option) => option.optionId === questionSession.correctOptionId,
  )
  if (resultsOnly) return <QuizAnswerResults questionSession={questionSession} />

  const Container = framed ? ItemCard : Box
  return (
    <Container sx={{ overflowWrap: 'anywhere' }}>
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {showMetadata ? (
              <QuizQuestionMetadata
                category={questionSession.categoryName}
                reward={questionSession.reward}
              />
            ) : null}
          </Box>
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
        {showQuestionText ? (
          <Typography variant="body1" fontWeight={700} sx={{ lineHeight: 1.35 }}>
            {questionSession.questionText}
          </Typography>
        ) : null}
        {showOptions ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 0.75 }}>
            {questionSession.options.map((option, index) => (
              <SelectionAction
                key={option.optionId}
                disabled
                tone="secondary"
                appearance="inset"
                density="compact"
                marker={index < 26 ? String.fromCharCode(65 + index) : `${index + 1}`}
                selected={own?.selectedOptionId === option.optionId}
                aria-label={[
                  option.text,
                  option.optionId === questionSession.correctOptionId
                    ? t('gameQuiz.answerCorrectStatus')
                    : null,
                  own?.selectedOptionId === option.optionId ? t('gameQuiz.yourChoice') : null,
                ]
                  .filter(Boolean)
                  .join(', ')}
                outcome={
                  option.optionId === questionSession.correctOptionId
                    ? 'success'
                    : own?.selectedOptionId === option.optionId
                      ? 'error'
                      : undefined
                }
              >
                <span>{option.text}</span>
              </SelectionAction>
            ))}
          </Box>
        ) : null}
        {correctOption ? (
          <QuizTextBlock label={t('gameQuiz.correctAnswerHeading')} inline>
            {correctOption.text}
          </QuizTextBlock>
        ) : null}
        {own ? (
          <InlineNotice
            severity={own.isCorrect ? 'success' : 'error'}
            icon={false}
            appearance="textured"
          >
            {t('gameQuiz.answerLabel', { answer: own.selectedOptionText })}
            {' · '}
            {own.isCorrect
              ? t('gameQuiz.resultCorrect', { points: own.awardedPoints })
              : t('gameQuiz.resultWrong')}
          </InlineNotice>
        ) : null}
        <QuizAnswerResults questionSession={questionSession} />
      </Stack>
    </Container>
  )
}

function QuizAnswerResults({ questionSession }: { questionSession: QuestionSession }) {
  const { t, i18n } = useTranslation()
  const correctCount = questionSession.submissions.filter((item) => item.isCorrect).length
  const incorrectCount = questionSession.submissions.length - correctCount
  const sortedSubmissions = [...questionSession.submissions].sort(
    (left, right) =>
      Number(right.isCorrect) - Number(left.isCorrect) ||
      left.displayName.localeCompare(right.displayName, i18n.resolvedLanguage),
  )

  return (
    <>
      {questionSession.status === 'closed' ? (
        <NativeDisclosure
          indicator="inline-chevron"
          density="compact"
          summary={
            <Typography component="span" variant="caption" fontWeight={400}>
              {t('gameQuiz.answerResultsSummary', {
                correct: correctCount,
                incorrect: incorrectCount,
              })}
            </Typography>
          }
        >
          <Stack component="ul" spacing={0.5} sx={{ m: 0, mt: 0.5, p: 0, listStyle: 'none' }}>
            {sortedSubmissions.map((submission) => (
              <ItemCard
                component="li"
                leadingAccent={submission.isCorrect ? 'success' : 'error'}
                sx={{ px: 1.25, py: 0.5 }}
                key={submission.userId}
                data-answer-result={submission.isCorrect ? 'correct' : 'incorrect'}
              >
                <Stack direction="row" spacing={0.75} alignItems="flex-start">
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere', lineHeight: 1.45 }}
                  >
                    <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {submission.displayName}:
                    </Box>{' '}
                    {submission.selectedOptionText}
                  </Typography>
                  <StatusBadge
                    size="small"
                    appearance="plain"
                    density="tight"
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
    </>
  )
}
