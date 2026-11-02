import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../api/contracts/generated'
import { resolveBackendMediaUrl } from '../api/media-url.ts'
import { ImageFrame, ItemCard, StatusBadge, TaskProgress } from '../ui/index.ts'
import { quizOptionText } from './quiz-image-text.ts'
import { useQuizCountdown } from './use-quiz-countdown.ts'

const deadline = () => {}

export function BroadcastScreenshot({
  state,
}: {
  state: components['schemas']['CurrentGameQuizStateDto']
}) {
  const { t, i18n } = useTranslation()
  const open = state.status === 'open'
  const countdown = useQuizCountdown(
    open ? state.askedAtUtc : null,
    open ? state.closesAtUtc : null,
    deadline,
  )
  if (!state.image) return null
  return (
    <Box sx={{ position: 'absolute', inset: 24, display: 'grid', placeItems: 'center' }}>
      <ItemCard
        frame="corner"
        sx={{ width: 'min(1280px, 100%)', maxHeight: '100%', overflow: 'auto' }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h3">{t('common.quizImage.question')}</Typography>
            <Typography variant="h3" role="timer">
              {open ? countdown.secondsLeft : t('common.quizImage.result')}
            </Typography>
          </Stack>
          <ImageFrame
            src={resolveBackendMediaUrl(state.image.imageUrl)}
            alt={t('common.quizImage.alt')}
            loadingLabel={t('common.quizImage.loading')}
            errorLabel={t('common.quizImage.error')}
            loading="eager"
            sizing="fill"
            fit="contain"
            sx={{ height: { xs: '32vh', sm: 'min(58vh, 640px)' } }}
          />
          {open ? (
            <TaskProgress
              variant="determinate"
              value={countdown.progress}
              aria-label={t('common.quizImage.timer')}
            />
          ) : null}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
              gap: 1,
            }}
          >
            {state.options.map((option, index) => (
              <ItemCard
                key={option.optionId}
                leadingAccent={option.optionId === state.correctOptionId ? 'success' : false}
              >
                <Stack gap={0.75} alignItems="flex-start">
                  <Stack direction="row" gap={1} alignItems="center">
                    <Typography variant="h5">!{index + 1}</Typography>
                    <Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>
                      {quizOptionText(state.image, option.optionId, option.text, i18n.language)}
                    </Typography>
                  </Stack>
                  {option.optionId === state.correctOptionId ? (
                    <StatusBadge color="success" label={t('common.quizImage.correct')} />
                  ) : null}
                </Stack>
              </ItemCard>
            ))}
          </Box>
        </Stack>
      </ItemCard>
    </Box>
  )
}
