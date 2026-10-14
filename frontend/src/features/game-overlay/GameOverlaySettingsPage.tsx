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
import { useOverlayTest } from './use-overlay-test.ts'

export function GameOverlaySettingsPage() {
  const { t, i18n } = useTranslation()
  const [url, setUrl] = useState('')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)
  const test = useOverlayTest()
  const rotate = useMutation({
    mutationFn: rotateOverlayKey,
    onSuccess: async ({ key }) => {
      const link = new URL('/overlay', window.location.origin)
      link.searchParams.set('lng', i18n.resolvedLanguage ?? 'ru')
      link.hash = new URLSearchParams({ key }).toString()
      setUrl(link.toString())
      setCopiedUrl(null)
      setCopyFailed(false)
      await test.reset(true)
    },
  })
  const revoke = useMutation({
    mutationFn: revokeOverlayKey,
    onSuccess: async () => {
      setUrl('')
      setCopiedUrl(null)
      setCopyFailed(false)
      await test.reset(false)
    },
  })
  const busy = rotate.isPending || revoke.isPending || test.change.isPending
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
          <Typography variant="body2">{t('gameOverlay.testHelp')}</Typography>
          {test.state.isError || test.change.isError ? (
            <InlineNotice severity="error">{t('gameOverlay.testError')}</InlineNotice>
          ) : null}
          {test.state.data?.enabled ? (
            <InlineNotice severity="info">{t('gameOverlay.testActive')}</InlineNotice>
          ) : null}
          <AppButton
            tone={test.state.data?.enabled ? 'secondary' : 'primary'}
            disabled={busy || !test.state.data?.hasKey || test.state.isError}
            loading={test.change.isPending}
            aria-pressed={test.state.data?.enabled ?? false}
            sx={{ alignSelf: 'flex-start' }}
            onClick={() => test.change.mutate(!test.state.data?.enabled)}
          >
            {t(test.state.data?.enabled ? 'gameOverlay.testStop' : 'gameOverlay.testStart')}
          </AppButton>
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
