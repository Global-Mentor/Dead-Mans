import { useState, type MouseEvent } from 'react'
import {
  Box,
  ButtonBase,
  Container,
  Divider,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  gameApplicationRoute,
  gameBoardRoute,
  gameSetupRoute,
  getPanelRouteByPath,
  teamRegistrationsRoute,
} from '../routes/app-routes.ts'
import { useAuth } from '../shared/auth/use-auth.ts'
import { LanguageSwitcher } from '../shared/i18n/LanguageSwitcher.tsx'
import { huntBrassTitleSx, huntOverlineSx } from '../shared/theme/surface-sx.ts'

const primaryRoutes = [gameBoardRoute, gameApplicationRoute]

export function PanelNavigation() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null)
  const activeRoute = getPanelRouteByPath(location.pathname)
  const canAdminister = user?.roles.includes('admin') ?? false

  if (!user) {
    return null
  }

  const closeProfile = () => setProfileAnchor(null)

  const handleProfileOpen = (event: MouseEvent<HTMLElement>) => {
    setProfileAnchor(event.currentTarget)
  }

  const handleLogout = async () => {
    closeProfile()
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <Box
      component="header"
      sx={(theme) => ({
        position: 'sticky',
        top: 0,
        zIndex: theme.zIndex.appBar,
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
        backgroundImage: theme.custom.gradients.panelAccentSoft,
        boxShadow: `0 10px 28px ${alpha(theme.palette.common.black, 0.35)}`,
        backdropFilter: 'blur(12px)',
      })}
    >
      <Container maxWidth="xl">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ minHeight: 64 }}
        >
          <Typography
            component={RouterLink}
            to={gameBoardRoute.fullPath}
            variant="h6"
            sx={{
              ...huntBrassTitleSx,
              color: 'primary.main',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {t('appTitle')}
          </Typography>

          <Stack
            component="nav"
            aria-label={t('navigation.primary')}
            direction="row"
            spacing={0.5}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            {primaryRoutes.map((route) => (
              <NavigationLink
                key={route.id}
                to={route.fullPath}
                label={t(route.labelKey)}
                isActive={activeRoute?.id === route.id}
              />
            ))}
          </Stack>

          <ButtonBase
            aria-controls={profileAnchor ? 'profile-menu' : undefined}
            aria-haspopup="menu"
            aria-expanded={profileAnchor ? 'true' : undefined}
            onClick={handleProfileOpen}
            sx={(theme) => ({
              maxWidth: { xs: 140, sm: 220 },
              px: 1.5,
              py: 1,
              borderRadius: 1,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
              backgroundColor: alpha(theme.palette.common.black, 0.16),
              '&:hover': {
                borderColor: alpha(theme.palette.primary.main, 0.55),
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              },
            })}
          >
            <Typography variant="body2" fontWeight={700} noWrap>
              {user.displayName}
            </Typography>
            <Box component="span" aria-hidden sx={{ ml: 1, color: 'primary.main' }}>
              ▾
            </Box>
          </ButtonBase>
        </Stack>

        <Stack
          component="nav"
          aria-label={t('navigation.primary')}
          direction="row"
          sx={{
            display: { xs: 'grid', sm: 'none' },
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            pb: 1,
          }}
        >
          {primaryRoutes.map((route) => (
            <NavigationLink
              key={route.id}
              to={route.fullPath}
              label={t(route.labelKey)}
              isActive={activeRoute?.id === route.id}
              fullWidth
            />
          ))}
        </Stack>
      </Container>

      <Menu
        id="profile-menu"
        anchorEl={profileAnchor}
        open={Boolean(profileAnchor)}
        onClose={closeProfile}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 260 } } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="overline" sx={huntOverlineSx}>
            {t('navigation.profile')}
          </Typography>
          <Typography variant="body1" fontWeight={700}>
            {user.displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user.roles.map((role) => t(`navigation.roles.${role}`)).join(', ')}
          </Typography>
        </Box>

        {canAdminister ? <Divider /> : null}
        {canAdminister ? (
          <Typography
            variant="overline"
            sx={{ ...huntOverlineSx, display: 'block', px: 2, pt: 1.5 }}
          >
            {t('navigation.administration')}
          </Typography>
        ) : null}
        {canAdminister ? (
          <MenuItem
            component={RouterLink}
            to={gameSetupRoute.fullPath}
            selected={activeRoute?.id === gameSetupRoute.id}
            onClick={closeProfile}
          >
            {t(gameSetupRoute.labelKey)}
          </MenuItem>
        ) : null}
        {canAdminister ? (
          <MenuItem
            component={RouterLink}
            to={teamRegistrationsRoute.fullPath}
            selected={activeRoute?.id === teamRegistrationsRoute.id}
            onClick={closeProfile}
          >
            {t(teamRegistrationsRoute.labelKey)}
          </MenuItem>
        ) : null}

        <Divider />
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="caption" color="text.secondary">
            {t('navigation.language')}
          </Typography>
          <LanguageSwitcher sx={{ mt: 0.75, width: '100%' }} />
        </Box>
        <Divider />
        <MenuItem onClick={() => void handleLogout()}>{t('navigation.logout')}</MenuItem>
      </Menu>
    </Box>
  )
}

interface NavigationLinkProps {
  to: string
  label: string
  isActive: boolean
  fullWidth?: boolean
}

function NavigationLink({ to, label, isActive, fullWidth = false }: NavigationLinkProps) {
  return (
    <ButtonBase
      component={RouterLink}
      to={to}
      aria-current={isActive ? 'page' : undefined}
      sx={(theme) => ({
        position: 'relative',
        width: fullWidth ? '100%' : 'auto',
        minHeight: 42,
        px: { xs: 1, sm: 2 },
        borderRadius: 1,
        color: isActive ? 'primary.light' : 'text.secondary',
        fontFamily: theme.typography.button.fontFamily,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        '&::after': {
          content: '""',
          position: 'absolute',
          right: 10,
          bottom: 2,
          left: 10,
          height: 2,
          backgroundColor: isActive ? 'primary.main' : 'transparent',
          transition: 'background-color 0.15s ease',
        },
        '&:hover': {
          color: 'text.primary',
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
        },
      })}
    >
      <Typography component="span" variant="button" noWrap>
        {label}
      </Typography>
    </ButtonBase>
  )
}
