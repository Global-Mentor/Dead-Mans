import { useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  AppButton,
  FormTextField,
  InlineNotice,
  PageShell,
  OrnamentDivider,
  SectionCard,
} from '../../shared/ui/index.ts'
import { fetchOverlayKey, revokeOverlayKey, rotateOverlayKey } from './api/overlay-api.ts'
import { useOverlayTest } from './use-overlay-test.ts'
import { useAuth } from '../../shared/auth/use-auth.ts'

export function GameOverlaySettingsPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const client = useQueryClient()
  const queryKey = ['overlay-key', user?.id] as const
  const savedKey = useQuery(
    queryOptions({
      queryKey,
      queryFn: ({ signal }) => fetchOverlayKey(signal),
      enabled: Boolean(user),
      gcTime: 0,
      refetchInterval: 5000,
    }),
  )
  const link = new URL('/overlay', window.location.origin)
  link.searchParams.set('lng', i18n.resolvedLanguage ?? 'ru')
  link.hash = new URLSearchParams({ key: savedKey.data?.key ?? '' }).toString()
  const url = savedKey.data?.key ? link.toString() : ''
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)
  const test = useOverlayTest()
  const rotate = useMutation({
    mutationFn: rotateOverlayKey,
    onMutate: () => client.cancelQueries({ queryKey }),
    onSuccess: async ({ key }) => {
      await client.cancelQueries({ queryKey })
      client.setQueryData(queryKey, { key })
      setCopiedUrl(null)
      setCopyFailed(false)
      await test.reset(true)
    },
  })
  const revoke = useMutation({
    mutationFn: revokeOverlayKey,
    onMutate: () => client.cancelQueries({ queryKey }),
    onSuccess: async () => {
      await client.cancelQueries({ queryKey })
      client.setQueryData(queryKey, { key: null })
      setCopiedUrl(null)
      setCopyFailed(false)
      await test.reset(false)
    },
  })
  const busy = rotate.isPending || revoke.isPending || test.change.isPending
  return (
    <PageShell sx={{ maxWidth: 760 }}>
      <SectionCard component="section" aria-labelledby="overlay-settings-title">
        <Stack spacing={1.5}>
          <Typography id="overlay-settings-title" component="h1" variant="h6" textAlign="center">
            {t('gameOverlay.title')}
          </Typography>
          <OrnamentDivider />
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {t('gameOverlay.setupHelp')}
          </Typography>
          {savedKey.isError || rotate.isError || revoke.isError ? (
            <InlineNotice severity="error">{t('gameOverlay.error')}</InlineNotice>
          ) : null}
          {revoke.isSuccess && !url ? (
            <InlineNotice severity="success">{t('gameOverlay.revoked')}</InlineNotice>
          ) : null}
          {url ? (
            <FormTextField
              label={t('gameOverlay.link')}
              value={url}
              slotProps={{ input: { readOnly: true } }}
              fullWidth
            />
          ) : savedKey.isSuccess && test.state.data?.hasKey ? (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {t('gameOverlay.savedLinkHelp')}
            </Typography>
          ) : null}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            <AppButton
              tone="primary"
              disabled={busy}
              loading={rotate.isPending}
              onClick={() => {
                revoke.reset()
                rotate.mutate()
              }}
            >
              {t(test.state.data?.hasKey ? 'gameOverlay.replace' : 'gameOverlay.create')}
            </AppButton>
            <AppButton
              tone="secondary"
              disabled={busy || !url || savedKey.isError}
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
          </Box>
          {copyFailed ? (
            <InlineNotice severity="error">{t('gameOverlay.copyError')}</InlineNotice>
          ) : null}
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {t('gameOverlay.keyHelp')}
          </Typography>
          <OrnamentDivider />
          {test.state.isError || test.change.isError ? (
            <InlineNotice severity="error">{t('gameOverlay.testError')}</InlineNotice>
          ) : null}
          {test.state.data?.enabled ? (
            <InlineNotice severity="info">{t('gameOverlay.testActive')}</InlineNotice>
          ) : (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {t('gameOverlay.testHelp')}
            </Typography>
          )}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            <AppButton
              tone="secondary"
              disabled={busy || !test.state.data?.hasKey || test.state.isError}
              loading={test.change.isPending}
              aria-pressed={test.state.data?.enabled ?? false}
              sx={{ gridColumn: { sm: 2 } }}
              onClick={() => test.change.mutate(!test.state.data?.enabled)}
            >
              {t(test.state.data?.enabled ? 'gameOverlay.testStop' : 'gameOverlay.testStart')}
            </AppButton>
          </Box>
        </Stack>
      </SectionCard>
    </PageShell>
  )
}
