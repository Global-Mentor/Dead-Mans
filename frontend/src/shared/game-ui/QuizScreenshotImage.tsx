import { useState } from 'react'
import { Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { resolveBackendMediaUrl } from '../api/media-url.ts'
import { AppButton, AppDialog, ImageFrame } from '../ui/index.ts'
import type { components } from '../api/contracts/generated'

type Image = components['schemas']['GameQuizImageDto']

export function QuizScreenshotImage({
  image,
  zoom = true,
  thumbnail = false,
  onReady,
  onError,
}: {
  image: Image
  zoom?: boolean
  thumbnail?: boolean
  onReady?: () => void
  onError?: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const picture = (expanded: boolean) => (
    <ImageFrame
      src={resolveBackendMediaUrl(
        thumbnail && !expanded ? (image.thumbnailUrl ?? image.imageUrl) : image.imageUrl,
      )}
      {...(!expanded && onReady ? { onReady } : {})}
      {...(!expanded && onError ? { onError } : {})}
      alt={t('common.quizImage.alt')}
      loadingLabel={t('common.quizImage.loading')}
      errorLabel={t('common.quizImage.error')}
      loading={thumbnail ? 'lazy' : 'eager'}
      sizing="fill"
      fit="contain"
      sx={{ width: '100%', height: expanded ? '70vh' : thumbnail ? 80 : { xs: 220, sm: 360 } }}
    />
  )
  return (
    <Stack spacing={0.75}>
      {picture(false)}
      {zoom && !thumbnail ? (
        <AppButton tone="secondary" onClick={() => setOpen(true)}>
          {t('common.quizImage.enlarge')}
        </AppButton>
      ) : null}
      {zoom && !thumbnail ? (
        <AppDialog
          open={open}
          onClose={() => setOpen(false)}
          title={t('common.quizImage.alt')}
          maxWidth="xl"
          actions={
            <AppButton tone="secondary" onClick={() => setOpen(false)}>
              {t('common.actions.close')}
            </AppButton>
          }
        >
          {picture(true)}
        </AppDialog>
      ) : null}
    </Stack>
  )
}
