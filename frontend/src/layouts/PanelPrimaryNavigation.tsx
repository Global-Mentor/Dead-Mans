import {
  SectionDivider,
  MenuGroupLabel,
  ActionMenu,
  ActionMenuItem,
  NavigationButton,
} from '../shared/ui/index.ts'
import { useId, useState } from 'react'
import { Box, Stack, Typography, useMediaQuery, useTheme } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import {
  gameApplicationRoute,
  gameModifiersRoute,
  gameQuizRoute,
  getPanelRouteByPath,
  panelRoutes,
} from '../routes/app-routes.ts'
import type { GameBoardSnapshot } from '../shared/api/contracts/index.ts'
import { NavigationChevron } from './NavigationChevron.tsx'

const primaryRoutes = panelRoutes.filter((route) => route.group === 'player')
const historyRoutes = primaryRoutes.filter((route) => route.id.endsWith('history'))

interface PanelPrimaryNavigationProps {
  activeRouteId: string | undefined
  gameStatus: GameBoardSnapshot['status'] | undefined
}

export function PanelPrimaryNavigation({ activeRouteId, gameStatus }: PanelPrimaryNavigationProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('lg'))
  const location = useLocation()
  const activeRoute = getPanelRouteByPath(location.pathname)
  const menuId = useId()
  const [menu, setMenu] = useState<{ anchor: HTMLElement; compact: boolean } | null>(null)
  const anchor = menu?.anchor ?? null
  const open = menu != null && menu.compact === compact && menu.anchor.isConnected
  const visibleRoutes = primaryRoutes.filter((route) => {
    if (route.id.endsWith('history')) {
      return false
    }

    if (route.id === gameApplicationRoute.id) {
      return gameStatus === 'ready'
    }

    if (route.id === gameModifiersRoute.id || route.id === gameQuizRoute.id) {
      return gameStatus === 'active'
    }

    return true
  })
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
            <NavigationButton
              key={route.id}
              component={RouterLink}
              to={route.fullPath}
              aria-current={isActive ? 'page' : undefined}
              active={isActive}
            >
              {t(route.labelKey)}
            </NavigationButton>
          )
        })}
      <NavigationButton
        key={compact ? 'compact' : 'desktop'}
        id={`${menuId}-trigger`}
        aria-label={compact ? t('navigation.openNavigation') : undefined}
        aria-controls={open ? menuId : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => setMenu({ anchor: event.currentTarget, compact })}
        active={!compact && historyActive}
        layout={compact ? 'compact' : 'route'}
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
      </NavigationButton>
      <ActionMenu
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
        {compact && <MenuGroupLabel disableSticky>{t('navigation.primary')}</MenuGroupLabel>}
        {compact &&
          visibleRoutes.map((route) => (
            <ActionMenuItem
              key={route.id}
              component={RouterLink}
              to={route.fullPath}
              selected={route.id === activeRouteId}
              aria-current={route.id === activeRouteId ? 'page' : undefined}
              onClick={closeMenu}
              sx={{ minHeight: 44 }}
            >
              {t(route.labelKey)}
            </ActionMenuItem>
          ))}
        {compact && <SectionDivider />}
        {compact && <MenuGroupLabel disableSticky>{t('navigation.history')}</MenuGroupLabel>}
        {historyRoutes.map((route) => (
          <ActionMenuItem
            key={route.id}
            component={RouterLink}
            to={route.fullPath}
            selected={route.id === activeRouteId}
            aria-current={route.id === activeRouteId ? 'page' : undefined}
            onClick={closeMenu}
            sx={{ minHeight: 44 }}
          >
            {t(route.labelKey)}
          </ActionMenuItem>
        ))}
      </ActionMenu>
    </Stack>
  )
}
