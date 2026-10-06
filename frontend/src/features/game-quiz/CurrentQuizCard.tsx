import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { CurrentGameQuizState } from '../../shared/api/contracts/index.ts'
import { API_ERROR_CODES } from '../../shared/api/errors/api-error-codes.ts'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { InlineNotice, SectionCard, SectionHeader } from '../../shared/ui/index.ts'
import { QuizQuestionContent } from './QuizQuestionContent.tsx'

type CurrentQuizCardProps = {
  state: CurrentGameQuizState | null
  isSubmitting: boolean
  answerDisabled?: boolean
  embedded?: boolean
  error: Error | null
  onSubmit: (questionSessionId: string, optionId: string) => void
  onDeadline: () => void
}

export function CurrentQuizCard({
  state,
  isSubmitting,
  answerDisabled = false,
  embedded = false,
  error,
  onSubmit,
  onDeadline,
}: CurrentQuizCardProps) {
  const { t } = useTranslation()
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
          title={t(
            !state
              ? 'gameQuiz.waitingTitle'
              : isOpen
                ? 'gameQuiz.currentTitle'
                : 'gameQuiz.resultTitle',
          )}
          description={description}
        />
      ) : null}

      {error ? (
        <InlineNotice
          appearance="textured"
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
    </SectionCard>
  )
}
