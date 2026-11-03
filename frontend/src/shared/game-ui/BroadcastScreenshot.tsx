import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../api/contracts/generated'
import { resolveBackendMediaUrl } from '../api/media-url.ts'
import { ChoiceMarker, ImageFrame, ItemCard, TaskProgress } from '../ui/index.ts'
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
  const clock = `${Math.floor(countdown.secondsLeft / 60)
    .toString()
    .padStart(2, '0')}:${(countdown.secondsLeft % 60).toString().padStart(2, '0')}`
  if (!state.image) return null
  return (
    <Box sx={{ position: 'absolute', inset: 24, display: 'grid', placeItems: 'center' }}>
      <ItemCard
        frame="corner"
        sx={{ width: 'min(1280px, 100%)', maxHeight: '100%', overflow: 'auto' }}
      >
        <Stack spacing={1.5}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'minmax(120px, 1fr) minmax(0, 4fr) minmax(120px, 1fr)',
              },
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Typography
              variant="h3"
              textAlign="center"
              sx={{ gridColumn: { xs: 1, sm: 2 }, minWidth: 0, overflowWrap: 'anywhere' }}
            >
              {state.text}
            </Typography>
            <Typography
              variant="h3"
              role="timer"
              aria-live="off"
              aria-label={t('common.quizImage.timer')}
              color={open && countdown.secondsLeft <= 10 ? 'error.light' : 'primary.light'}
              sx={{
                gridColumn: { xs: 1, sm: 3 },
                justifySelf: { xs: 'center', sm: 'end' },
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {clock}
            </Typography>
          </Box>
          <ImageFrame
            src={resolveBackendMediaUrl(state.image.imageUrl)}
            alt={t('common.quizImage.alt')}
            loadingLabel={t('common.quizImage.loading')}
            errorLabel={t('common.quizImage.error')}
            loading="eager"
            sizing="fill"
            fit="contain"
            sx={{ height: { xs: '24vh', sm: 'min(58vh, 640px)' } }}
          />
          <TaskProgress
            variant="determinate"
            value={countdown.progress}
            aria-label={t('common.quizImage.timer')}
          />
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
                {...(option.optionId === state.correctOptionId
                  ? { outcome: 'success' as const }
                  : {})}
                role="group"
                aria-label={
                  option.optionId === state.correctOptionId
                    ? t('common.quizImage.correct')
                    : undefined
                }
              >
                <Stack direction="row" gap={1} alignItems="center">
                  <ChoiceMarker>{`!${index + 1}`}</ChoiceMarker>
                  <Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>
                    {quizOptionText(state.image, option.optionId, option.text, i18n.language)}
                  </Typography>
                </Stack>
              </ItemCard>
            ))}
          </Box>
        </Stack>
      </ItemCard>
    </Box>
  )
}
