import { useMemo, useState } from 'react'
import {
  Box,
  ButtonBase,
  Chip,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getPanelRouteByPath } from '../routes/app-routes.ts'
import { useAccessiblePanelRoutes } from '../routes/use-accessible-panel-routes.ts'
import { useAuth } from '../shared/auth/use-auth.ts'
import { huntBrassTitleSx, huntOverlineSx } from '../shared/theme/surface-sx.ts'
import { AppButton, SectionCard } from '../shared/ui/index.ts'

export function PanelNavigationDrawer() {
  const { t } = useTranslation()
  const location = useLocation()
  const { user } = useAuth()
  const accessibleRoutes = useAccessiblePanelRoutes()
  const [isOpen, setIsOpen] = useState(false)
  const activeRoute = useMemo(() => getPanelRouteByPath(location.pathname), [location.pathname])

  if (!user || accessibleRoutes.length === 0) {
    return null
  }

  return (
    <>
      <ButtonBase
        focusRipple
        aria-label={t('navigation.open')}
        onClick={() => setIsOpen(true)}
        sx={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderRadius: '6px 0 0 6px',
          opacity: isOpen ? 0 : 1,
          pointerEvents: isOpen ? 'none' : 'auto',
          transition: 'opacity 0.2s ease',
        }}
      >
        <SectionCard
          sx={{
            px: 1.5,
            py: 1.75,
            maxWidth: 120,
            borderRadius: '6px 0 0 6px',
            background: (theme) => theme.custom.gradients.panelAccent,
          }}
        >
          <Stack spacing={0.75} alignItems="center">
            <Typography variant="caption" sx={huntOverlineSx}>
              {t('navigation.thumbnail')}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                textAlign: 'center',
                fontWeight: 700,
                lineHeight: 1.2,
                color: 'text.primary',
              }}
            >
              {activeRoute ? t(activeRoute.labelKey) : t('navigation.title')}
            </Typography>
          </Stack>
        </SectionCard>
      </ButtonBase>

      <Drawer
        anchor="right"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: 300, sm: 340 },
            px: 2.5,
            py: 3,
          },
        }}
      >
        <Stack spacing={3} sx={{ height: '100%' }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
              <Box>
                <Typography variant="overline" sx={huntOverlineSx}>
                  {t('navigation.title')}
                </Typography>
                <Typography variant="h6" sx={{ ...huntBrassTitleSx, mt: 0.5 }}>
                  {user.displayName}
                </Typography>
              </Box>
              <AppButton tone="ghost" size="small" onClick={() => setIsOpen(false)}>
                {t('navigation.close')}
              </AppButton>
            </Stack>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {user.roles.map((role) => (
                <Chip key={role} size="small" label={t(`navigation.roles.${role}`)} />
              ))}
            </Stack>
          </Stack>

          <Divider />

          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.25, ...huntOverlineSx }}>
              {t('navigation.availableSections')}
            </Typography>

            <List disablePadding>
              {accessibleRoutes.map((route) => {
                const isActive = activeRoute?.id === route.id

                return (
                  <ListItemButton
                    key={route.id}
                    component={RouterLink}
                    to={route.fullPath}
                    selected={isActive}
                    onClick={() => setIsOpen(false)}
                    sx={(theme) => ({
                      mb: 1,
                      borderRadius: 1,
                      alignItems: 'flex-start',
                      borderLeft: isActive
                        ? `3px solid ${theme.palette.primary.main}`
                        : `3px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                    })}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: isActive ? 700 : 600,
                            color: isActive ? 'primary.light' : 'text.primary',
                          }}
                        >
                          {t(route.labelKey)}
                        </Typography>
                      }
                      secondary={route.descriptionKey ? t(route.descriptionKey) : undefined}
                      secondaryTypographyProps={{
                        sx: {
                          mt: 0.5,
                          color: 'text.secondary',
                        },
                      }}
                    />
                  </ListItemButton>
                )
              })}
            </List>
          </Box>
        </Stack>
      </Drawer>
    </>
  )
}
