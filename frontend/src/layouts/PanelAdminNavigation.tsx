import {
  MenuGroupLabel,
  ActionMenu,
  ActionMenuItem,
  NavigationButton,
  HelpTooltip,
} from '../shared/ui/index.ts'
import { useId, useState, type MouseEvent } from 'react'
import { Box, SvgIcon, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { gameSetupDraftQueryOptions } from '../features/game-setup/index.ts'
import {
  adminModifiersRoute,
  adminQuestionsRoute,
  hasAccessToPanelRoute,
  panelRoutes,
  type PanelAdminSection,
} from '../routes/app-routes.ts'
import type { AuthRole } from '../shared/api/contracts/index.ts'
import { NavigationChevron } from './NavigationChevron.tsx'

const adminSections: ReadonlyArray<{
  id: PanelAdminSection
  labelKey:
    | 'navigation.adminSections.currentGame'
    | 'navigation.adminSections.catalog'
    | 'navigation.adminSections.system'
}> = [
  {
    id: 'current-game',
    labelKey: 'navigation.adminSections.currentGame',
  },
  { id: 'catalog', labelKey: 'navigation.adminSections.catalog' },
  { id: 'system', labelKey: 'navigation.adminSections.system' },
]

const draftDependentRouteIds = new Set([adminModifiersRoute.id, adminQuestionsRoute.id])

const sectionIconPaths: Record<PanelAdminSection, string> = {
  'current-game': 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  catalog: 'M4 4h5v16H4zM4 8h5M12 5l5-1 3 15-5 1zM13 9l5-1',
  system: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6zM9 12l2 2 4-4',
}

interface PanelAdminNavigationProps {
  activeRouteId: string | undefined
  roles: readonly AuthRole[]
}

export function PanelAdminNavigation({ activeRouteId, roles }: PanelAdminNavigationProps) {
  const { t } = useTranslation()
  const triggerId = useId()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const accessibleSections = adminSections
    .map((section) => ({
      ...section,
      routes: panelRoutes.filter(
        (route) =>
          route.group === 'admin' &&
          route.adminSection === section.id &&
          hasAccessToPanelRoute(route, roles),
      ),
    }))
    .filter((section) => section.routes.length > 0)
  const accessibleRoutes = accessibleSections.flatMap((section) => section.routes)
  const needsDraftState = accessibleRoutes.some((route) => draftDependentRouteIds.has(route.id))
  const { data: draftState } = useQuery({
    ...gameSetupDraftQueryOptions,
    staleTime: 60_000,
    enabled: needsDraftState,
  })
  const hasDraftGame = draftState?.snapshot != null
  const isActive = accessibleRoutes.some((route) => route.id === activeRouteId)

  if (accessibleSections.length === 0) return null

  const openMenu = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)
  const closeMenu = () => setAnchor(null)

  return (
    <nav aria-label={t('navigation.adminNavigation')}>
      <HelpTooltip title={t('navigation.administration')}>
        <NavigationButton
          id={triggerId}
          aria-label={t('navigation.administration')}
          aria-controls={anchor ? `${triggerId}-menu` : undefined}
          aria-expanded={anchor ? 'true' : undefined}
          aria-haspopup="menu"
          aria-current={isActive ? 'page' : undefined}
          onClick={openMenu}
          active={isActive}
          layout="management"
        >
          <SvgIcon aria-hidden sx={{ fontSize: 17 }}>
            <path
              d="M5 4v16M12 4v16M19 4v16M2 8h6M9 16h6M16 9h6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </SvgIcon>
          <Typography
            component="span"
            sx={{ display: { xs: 'none', lg: 'block' }, font: 'inherit' }}
          >
            {t('navigation.manage')}
          </Typography>
          <Box component="span" sx={{ display: { xs: 'none', lg: 'flex' } }}>
            <NavigationChevron open={Boolean(anchor)} />
          </Box>
        </NavigationButton>
      </HelpTooltip>

      <ActionMenu
        id={`${triggerId}-menu`}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: { sx: { mt: 1, width: 320, maxWidth: 'calc(100vw - 32px)' } },
          list: { 'aria-labelledby': triggerId },
        }}
      >
        {accessibleSections.map((section, index) => [
          <MenuGroupLabel
            key={`${section.id}-heading`}
            disableSticky
            sx={(theme) => ({
              color: theme.palette.primary.light,
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontSize: 15,
              fontWeight: 600,
              lineHeight: 1.5,
              letterSpacing: '0.01em',
              textTransform: 'none',
              px: 2,
              pt: index === 0 ? 1 : 2.25,
              pb: 0.75,
              '&::after': {
                content: '""',
                flex: 1,
                minWidth: 16,
                height: '1px',
                ml: 0.5,
                backgroundImage: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.4)}, transparent)`,
              },
            })}
          >
            <SvgIcon aria-hidden sx={{ fontSize: 16, flexShrink: 0 }}>
              <path
                d={sectionIconPaths[section.id]}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </SvgIcon>
            {t(section.labelKey)}
          </MenuGroupLabel>,
          ...section.routes.map((route) => {
            const isDisabled = draftDependentRouteIds.has(route.id) && !hasDraftGame

            return isDisabled ? (
              <ActionMenuItem key={route.id} disabled sx={{ minHeight: 44, whiteSpace: 'normal' }}>
                {t(route.labelKey)}
              </ActionMenuItem>
            ) : (
              <ActionMenuItem
                key={route.id}
                component={RouterLink}
                to={route.fullPath}
                selected={activeRouteId === route.id}
                onClick={closeMenu}
                aria-current={activeRouteId === route.id ? 'page' : undefined}
                sx={{ minHeight: 44, whiteSpace: 'normal' }}
              >
                {t(route.labelKey)}
              </ActionMenuItem>
            )
          }),
        ])}
      </ActionMenu>
    </nav>
  )
}
