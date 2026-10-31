import { Box, Stack } from '@mui/material'
import { lazy } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../shared/auth/use-auth.ts'
import { LanguageSwitcher } from '../shared/i18n/LanguageSwitcher.tsx'
import { AppButton, SectionCard } from '../shared/ui/index.ts'
import { uiTokens } from '../shared/theme/tokens.ts'

const MainLayout = lazy(() =>
  import('./MainLayout.tsx').then((module) => ({ default: module.MainLayout })),
)

/** Public rules do not mount the panel's queries or realtime subscriptions. */
export function GameGuideLayout() {
  const { isAuthenticated, startTwitchLogin } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  if (isAuthenticated) return <MainLayout />

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <SectionCard
        component="header"
        sx={{ position: 'sticky', top: 0, zIndex: (theme) => theme.zIndex.appBar, px: 1, py: 0.5 }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
          sx={{ maxWidth: 1040, mx: 'auto', minHeight: 44 }}
        >
          <LanguageSwitcher sx={{ width: 72, flexShrink: 0 }} />
          <AppButton
            brand="twitch"
            size="small"
            sx={{ flexShrink: 0 }}
            onClick={() =>
              startTwitchLogin(`${location.pathname}${location.search}${location.hash}`)
            }
          >
            {t('auth.button')}
          </AppButton>
        </Stack>
      </SectionCard>
      <Box component="main" sx={{ p: uiTokens.spacing.page }}>
        <Outlet />
      </Box>
    </Box>
  )
}
