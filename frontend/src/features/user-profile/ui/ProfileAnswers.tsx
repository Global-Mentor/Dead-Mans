import { Box, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, AppDialog, ItemCard, StatusBadge } from '../../../shared/ui/index.ts'
import { QuizScreenshotImage, quizOptionText } from '../../../shared/game-ui/index.ts'
import type { ProfileAnswer } from '../api/user-profile-queries.ts'
import { profileDate } from '../profile-date.ts'

export function ProfileAnswers({ answers }: { answers: readonly ProfileAnswer[] }) {
  const { t, i18n } = useTranslation()
  const [preview, setPreview] = useState<ProfileAnswer | null>(null)
  return (
    <>
      <Stack component="ul" spacing={1.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {answers.map((answer) => (
          <ItemCard component="li" density="compact" key={answer.questionSessionId}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: answer.image
                  ? { xs: '1fr', sm: '112px minmax(0, 1fr) auto' }
                  : '1fr',
                gap: 1.5,
                alignItems: 'center',
              }}
            >
              {answer.image ? (
                <Box sx={{ width: 112 }}>
                  <QuizScreenshotImage image={answer.image} thumbnail />
                </Box>
              ) : null}
              <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ overflowWrap: 'anywhere' }}
                  >
                    {answer.categoryName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {profileDate(answer.submittedAtUtc, i18n.language, '')}
                  </Typography>
                </Stack>
                <Typography
                  component="h3"
                  variant="subtitle2"
                  sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}
                >
                  {answer.questionText}
                </Typography>
                <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                    {t('userProfile.selectedAnswer', {
                      answer: quizOptionText(
                        answer.image,
                        answer.selectedOptionId,
                        answer.selectedOptionText,
                        i18n.language,
                      ),
                    })}
                  </Typography>
                  <StatusBadge
                    density="compact"
                    color={answer.isCorrect ? 'success' : 'error'}
                    label={t(answer.isCorrect ? 'userProfile.correct' : 'userProfile.incorrect')}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {t('userProfile.awardedPoints', {
                      points: new Intl.NumberFormat(i18n.language).format(answer.awardedPoints),
                    })}
                  </Typography>
                </Stack>
              </Stack>
              {answer.image ? (
                <AppButton size="small" tone="ghost" onClick={() => setPreview(answer)}>
                  {t('userProfile.viewScreenshot')}
                </AppButton>
              ) : null}
            </Box>
          </ItemCard>
        ))}
      </Stack>
      <AppDialog
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={t('userProfile.viewScreenshot')}
        maxWidth="lg"
        actions={
          <AppButton tone="secondary" onClick={() => setPreview(null)}>
            {t('common.actions.close')}
          </AppButton>
        }
      >
        {preview?.image ? (
          <Stack spacing={1}>
            <Typography variant="h6">{preview.questionText}</Typography>
            <QuizScreenshotImage image={preview.image} zoom={false} />
          </Stack>
        ) : null}
      </AppDialog>
    </>
  )
}
