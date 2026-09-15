import { useState, type MouseEvent } from 'react'
import { Box, ButtonBase, Chip, Divider, Menu, MenuItem, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { AuthContextValue, AuthUser } from '../shared/auth/auth-context.ts'
import type { AuthRole } from '../shared/api/contracts/index.ts'
import { LanguageSwitcher } from '../shared/i18n/LanguageSwitcher.tsx'
import { huntOverlineSx } from '../shared/theme/surface-sx.ts'
import { navigationButtonSx } from './navigation-styles.ts'
import { NavigationChevron } from './NavigationChevron.tsx'

interface PanelProfileMenuProps {
  user: AuthUser
  onLogout: AuthContextValue['logout']
}

function roleColor(role: AuthRole): 'warning' | 'info' | 'default' {
  if (role === 'superadmin' || role === 'admin') return 'warning'
  if (role === 'moderator') return 'info'
  return 'default'
}

export function PanelProfileMenu({ user, onLogout }: PanelProfileMenuProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null)
  const closeProfile = () => setProfileAnchor(null)

  const handleProfileOpen = (event: MouseEvent<HTMLElement>) => {
    setProfileAnchor(event.currentTarget)
  }

  const handleLogout = async () => {
    closeProfile()
    await onLogout()
    navigate('/', { replace: true })
  }

  return (
    <>
      <ButtonBase
        aria-label={user.displayName}
        aria-controls={profileAnchor ? 'profile-menu' : undefined}
        aria-haspopup="menu"
        aria-expanded={profileAnchor ? 'true' : undefined}
        onClick={handleProfileOpen}
        sx={(theme) => ({
          ...navigationButtonSx(Boolean(profileAnchor))(theme),
          maxWidth: 200,
          minWidth: 44,
          px: 0.75,
        })}
      >
        <Box
          component="span"
          aria-hidden
          sx={(theme) => ({
            width: 30,
            height: 30,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.primary.main, 0.14),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
            color: 'primary.light',
            fontSize: 15,
            fontWeight: 700,
          })}
        >
          {Array.from(user.displayName)[0]?.toLocaleUpperCase()}
        </Box>
        <Typography
          variant="body2"
          fontWeight={700}
          noWrap
          sx={{ display: { xs: 'none', xl: 'block' } }}
        >
          {user.displayName}
        </Typography>
        <Box component="span" aria-hidden sx={{ display: { xs: 'none', xl: 'flex' } }}>
          <NavigationChevron open={Boolean(profileAnchor)} />
        </Box>
      </ButtonBase>

      <Menu
        id="profile-menu"
        anchorEl={profileAnchor}
        open={Boolean(profileAnchor)}
        onClose={closeProfile}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, width: 280, maxWidth: 'calc(100vw - 32px)' } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="overline" sx={huntOverlineSx}>
            {t('navigation.profile')}
          </Typography>
          <Typography variant="body1" fontWeight={700} sx={{ mt: 0.25 }}>
            {user.displayName}
          </Typography>
        </Box>

        <Divider />
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="overline" sx={huntOverlineSx}>
            {t('navigation.accessRoles')}
          </Typography>
          <Stack direction="row" gap={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
            {user.roles.map((role) => (
              <Chip
                key={role}
                size="small"
                color={roleColor(role)}
                variant={role === 'viewer' ? 'outlined' : 'filled'}
                label={t(`navigation.roles.${role}`)}
              />
            ))}
          </Stack>
        </Box>

        <Divider />
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="overline" sx={huntOverlineSx}>
            {t('navigation.language')}
          </Typography>
          <LanguageSwitcher sx={{ mt: 0.75, width: '100%' }} />
        </Box>
        <Divider />
        <MenuItem onClick={() => void handleLogout()}>{t('navigation.logout')}</MenuItem>
      </Menu>
    </>
  )
}
