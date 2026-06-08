import { Box, Stack, Typography } from '@mui/material'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { panelRootPath } from '../../routes/app-routes.ts'
import { useAuth } from '../../shared/auth/use-auth.ts'
import { LanguageSwitcher } from '../../shared/i18n/LanguageSwitcher.tsx'
import { AppButton, CenteredProgress, SectionCard } from '../../shared/ui/index.ts'
import { uiTokens } from '../../shared/theme/tokens.ts'

export function AuthLandingPage() {
  const { t } = useTranslation()
  const { authStatus, isAuthenticated, startTwitchLogin } = useAuth()

  if (authStatus === 'checking') {
    return <CenteredProgress minHeight="100vh" message={t('auth.checkingSession')} />
  }

  if (isAuthenticated) {
    return <Navigate to={panelRootPath} replace />
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
        }}
      >
        <LanguageSwitcher />
      </Box>
      <SectionCard
        sx={{
          px: 6,
          py: 5,
          maxWidth: 480,
          textAlign: 'center',
          background: (theme) => theme.custom.gradients.authCard,
          border: 'none',
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {t('auth.title')}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              {t('auth.subtitle')}
            </Typography>
          </Box>

          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {t('auth.description')}
            </Typography>
            <AppButton
              size="large"
              onClick={startTwitchLogin}
              sx={{
                mt: 1,
                px: 4,
                py: 1.2,
                backgroundColor: uiTokens.brand.twitch,
                '&:hover': {
                  backgroundColor: uiTokens.brand.twitchHover,
                },
              }}
            >
              {t('auth.button')}
            </AppButton>
          </Box>
        </Stack>
      </SectionCard>
    </Box>
  )
}


