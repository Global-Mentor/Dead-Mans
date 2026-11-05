import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import { QuizScreenshotImage, quizOptionText } from '../../shared/game-ui/index.ts'
import { InlineNotice } from '../../shared/ui/index.ts'

export function QuizLaunchPreview({
  question,
  onReady,
  onError,
}: {
  question: components['schemas']['AvailableGameQuizQuestionDto']
  onReady: () => void
  onError: () => void
}) {
  const { t, i18n } = useTranslation()
  return (
    <Stack spacing={1} sx={{ overflowY: 'auto', minHeight: 0 }}>
      <InlineNotice severity="info">{t('gameQuiz.previewBeforeStart')}</InlineNotice>
      <Typography variant="h6">{question.text}</Typography>
      {question.image ? (
        <QuizScreenshotImage image={question.image} onReady={onReady} onError={onError} />
      ) : null}
      <Stack component="ul" spacing={0.5}>
        {(question.options ?? []).map((option) => (
          <Typography key={option.optionId} component="li" variant="body1">
            {quizOptionText(question.image, option.optionId, option.text, i18n.language)}
          </Typography>
        ))}
      </Stack>
    </Stack>
  )
}
