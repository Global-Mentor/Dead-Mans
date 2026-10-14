import { useState } from 'react'
import { Stack, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  AppButton,
  FormTextField,
  InlineNotice,
  PageShell,
  SectionCard,
} from '../../shared/ui/index.ts'
import { revokeOverlayKey, rotateOverlayKey } from './api/overlay-api.ts'

export function GameOverlaySettingsPage() {
  const { t, i18n } = useTranslation()
  const [url, setUrl] = useState('')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)
  const rotate = useMutation({
    mutationFn: rotateOverlayKey,
    onSuccess: ({ key }) => {
      const link = new URL('/overlay', window.location.origin)
      link.searchParams.set('lng', i18n.resolvedLanguage ?? 'ru')
      link.hash = new URLSearchParams({ key }).toString()
      setUrl(link.toString())
      setCopiedUrl(null)
      setCopyFailed(false)
    },
  })
  const revoke = useMutation({
    mutationFn: revokeOverlayKey,
    onSuccess: () => {
      setUrl('')
      setCopiedUrl(null)
      setCopyFailed(false)
    },
  })
  const busy = rotate.isPending || revoke.isPending
  return (
    <PageShell>
      <SectionCard>
        <Stack spacing={2}>
          <Typography component="h1" variant="h4">
            {t('gameOverlay.title')}
          </Typography>
          <Typography>{t('gameOverlay.instructions')}</Typography>
          <Typography variant="body2">{t('gameOverlay.keyHelp')}</Typography>
          {rotate.isError || revoke.isError ? (
            <InlineNotice severity="error">{t('gameOverlay.error')}</InlineNotice>
          ) : null}
          {revoke.isSuccess && !url ? (
            <InlineNotice severity="success">{t('gameOverlay.revoked')}</InlineNotice>
          ) : null}
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <AppButton
              tone="primary"
              disabled={busy}
              loading={rotate.isPending}
              onClick={() => {
                revoke.reset()
                rotate.mutate()
              }}
            >
              {t('gameOverlay.rotate')}
            </AppButton>
            <AppButton
              tone="danger"
              disabled={busy}
              loading={revoke.isPending}
              onClick={() => {
                rotate.reset()
                revoke.mutate()
              }}
            >
              {t('gameOverlay.revoke')}
            </AppButton>
          </Stack>
          {copyFailed ? (
            <InlineNotice severity="error">{t('gameOverlay.copyError')}</InlineNotice>
          ) : null}
          {url ? (
            <>
              <FormTextField
                label={t('gameOverlay.link')}
                value={url}
                slotProps={{ input: { readOnly: true } }}
                fullWidth
              />
              <AppButton
                tone="secondary"
                disabled={busy}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url)
                    setCopiedUrl(url)
                    setCopyFailed(false)
                  } catch {
                    setCopiedUrl(null)
                    setCopyFailed(true)
                  }
                }}
              >
                {t(copiedUrl === url ? 'gameOverlay.copied' : 'gameOverlay.copy')}
              </AppButton>
            </>
          ) : null}
        </Stack>
      </SectionCard>
    </PageShell>
  )
}
