import { Box, Container, Divider, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../shared/i18n/LanguageSwitcher.tsx'
import { huntBrassTitleSx } from '../shared/theme/surface-sx.ts'
import { uiTokens } from '../shared/theme/tokens.ts'
import { PanelNavigationDrawer } from './PanelNavigationDrawer.tsx'

export function MainLayout() {
  const { t } = useTranslation()

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box
        component="header"
        sx={(theme) => ({
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
          backgroundImage: theme.custom.gradients.panelAccentSoft,
          boxShadow: `0 10px 28px ${alpha(theme.palette.common.black, 0.35)}`,
        })}
      >
        <Typography variant="h6" sx={huntBrassTitleSx}>
          {t('appTitle')}
        </Typography>
        <LanguageSwitcher />
      </Box>

      <Container
        component="main"
        sx={{
          flexGrow: 1,
          py: 3,
          pb: uiTokens.spacing.page.md,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Outlet />
      </Container>

      <Divider sx={{ opacity: 0.45 }} />
      <PanelNavigationDrawer />
    </Box>
  )
}
