import { useId, useState } from 'react'
import {
  Box,
  ButtonBase,
  Divider,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { gameApplicationRoute, getPanelRouteByPath, panelRoutes } from '../routes/app-routes.ts'
import { navigationButtonSx } from './navigation-styles.ts'
import { NavigationChevron } from './NavigationChevron.tsx'

const primaryRoutes = panelRoutes.filter((route) => route.group === 'player')
const historyRoutes = primaryRoutes.filter((route) => route.id.endsWith('history'))

interface PanelPrimaryNavigationProps {
  activeRouteId: string | undefined
  showGameApplication: boolean
}

export function PanelPrimaryNavigation({
  activeRouteId,
  showGameApplication,
}: PanelPrimaryNavigationProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('lg'))
  const location = useLocation()
  const activeRoute = getPanelRouteByPath(location.pathname)
  const menuId = useId()
  const [menu, setMenu] = useState<{ anchor: HTMLElement; compact: boolean } | null>(null)
  const anchor = menu?.anchor ?? null
  const open = menu != null && menu.compact === compact && menu.anchor.isConnected
  const visibleRoutes = primaryRoutes.filter(
    (route) =>
      !route.id.endsWith('history') &&
      (showGameApplication || route.id !== gameApplicationRoute.id),
  )
  const historyActive = historyRoutes.some((route) => route.id === activeRouteId)
  const closeMenu = () => setMenu(null)

  return (
    <Stack
      component="nav"
      aria-label={t('navigation.primary')}
      direction="row"
      sx={{ minWidth: 0, alignItems: 'center', gap: 0.25 }}
    >
      {!compact &&
        visibleRoutes.map((route) => {
          const isActive = route.id === activeRouteId

          return (
            <ButtonBase
              key={route.id}
              component={RouterLink}
              to={route.fullPath}
              aria-current={isActive ? 'page' : undefined}
              sx={navigationButtonSx(isActive)}
            >
              {t(route.labelKey)}
            </ButtonBase>
          )
        })}
      <ButtonBase
        key={compact ? 'compact' : 'desktop'}
        id={`${menuId}-trigger`}
        aria-label={compact ? t('navigation.openNavigation') : undefined}
        aria-controls={open ? menuId : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => setMenu({ anchor: event.currentTarget, compact })}
        sx={(theme) => ({
          ...navigationButtonSx(!compact && historyActive)(theme),
          ...(compact ? { width: '100%', justifyContent: 'flex-start', px: 1, minWidth: 0 } : {}),
        })}
      >
        {compact && (
          <Box
            component="span"
            aria-hidden
            sx={{ display: 'grid', gap: '4px', flexShrink: 0, mr: 0.5 }}
          >
            <Box sx={{ width: 14, borderTop: '1.5px solid' }} />
            <Box sx={{ width: 10, borderTop: '1.5px solid' }} />
          </Box>
        )}
        <Typography component="span" noWrap sx={{ font: 'inherit', minWidth: 0 }}>
          {compact
            ? activeRoute
              ? t(activeRoute.labelKey)
              : t('navigation.menu')
            : t('navigation.history')}
        </Typography>
        <NavigationChevron open={open} />
      </ButtonBase>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={open}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: { sx: { mt: 1, width: compact ? 300 : 260, maxWidth: 'calc(100vw - 32px)' } },
          list: { 'aria-labelledby': `${menuId}-trigger` },
        }}
      >
        {compact && <ListSubheader disableSticky>{t('navigation.primary')}</ListSubheader>}
        {compact &&
          visibleRoutes.map((route) => (
            <MenuItem
              key={route.id}
              component={RouterLink}
              to={route.fullPath}
              selected={route.id === activeRouteId}
              aria-current={route.id === activeRouteId ? 'page' : undefined}
              onClick={closeMenu}
              sx={{ minHeight: 44 }}
            >
              {t(route.labelKey)}
            </MenuItem>
          ))}
        {compact && <Divider />}
        {compact && <ListSubheader disableSticky>{t('navigation.history')}</ListSubheader>}
        {historyRoutes.map((route) => (
          <MenuItem
            key={route.id}
            component={RouterLink}
            to={route.fullPath}
            selected={route.id === activeRouteId}
            aria-current={route.id === activeRouteId ? 'page' : undefined}
            onClick={closeMenu}
            sx={{ minHeight: 44 }}
          >
            {t(route.labelKey)}
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  )
}
