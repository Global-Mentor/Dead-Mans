import { Box, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supportedLanguages } from '../../locales/index.ts'
import {
  AppButton,
  AppDialog,
  DetailBlock,
  ImageFrame,
  SurfaceButton,
} from '../../shared/ui/index.ts'

export function GuideIllustration({ kind }: { kind: 'board' | 'application' }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const language = supportedLanguages.find((locale) => locale === i18n.resolvedLanguage) ?? 'en'
  const title = t(`gameGuide.images.${kind}`)
  const image = (
    <ImageFrame
      src={`/images/game-guide/${kind}-${language}.png`}
      alt={title}
      loadingLabel={t('gameGuide.images.loading')}
      errorLabel={t('gameGuide.images.error')}
      loading="lazy"
      sizing="fill"
      sx={{
        aspectRatio: kind === 'application' ? '1280 / 700' : '432 / 565',
        maxWidth: kind === 'application' ? 1280 : 432,
      }}
    />
  )

  return (
    <>
      <DetailBlock component="figure" sx={{ m: 0 }}>
        <SurfaceButton
          onClick={() => setOpen(true)}
          aria-label={t('gameGuide.images.enlarge', { name: title })}
          sx={{ width: '100%' }}
        >
          <Stack spacing={1} alignItems="center" sx={{ width: '100%' }}>
            {image}
            <Typography variant="button" color="primary.light">
              {t('gameGuide.images.view')}
            </Typography>
          </Stack>
        </SurfaceButton>
        <Stack component="figcaption" spacing={0.5} sx={{ mt: 1.5 }}>
          <Typography variant="body2">{t(`gameGuide.images.${kind}Caption`)}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t('gameGuide.images.note')}
          </Typography>
        </Stack>
      </DetailBlock>
      <AppDialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        maxWidth={kind === 'application' ? 'xl' : 'lg'}
        fullWidth
        actions={
          <AppButton tone="secondary" onClick={() => setOpen(false)}>
            {t('gameGuide.close')}
          </AppButton>
        }
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('gameGuide.images.previewHint')}
        </Typography>
        <Box role="region" aria-label={title} tabIndex={0} sx={{ overflowX: 'auto' }}>
          <Box
            sx={{
              minWidth: kind === 'application' ? 1280 : 432,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {image}
          </Box>
        </Box>
      </AppDialog>
    </>
  )
}
