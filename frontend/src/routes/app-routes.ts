import type { AuthRole } from '../shared/api/contracts/index.ts'

export const panelRootPath = '/panel'

export interface PanelRouteDefinition {
  id: string
  path: string
  fullPath: string
  labelKey: string
  descriptionKey?: string
  allowedRoles?: readonly AuthRole[]
}

const authenticatedPanelRoles = ['viewer', 'moderator', 'admin'] as const satisfies readonly AuthRole[]

export const gameBoardRoute = {
  id: 'game-board',
  path: 'game-board',
  fullPath: `${panelRootPath}/game-board`,
  labelKey: 'navigation.items.gameBoard.label',
  descriptionKey: 'navigation.items.gameBoard.description',
  allowedRoles: authenticatedPanelRoles,
} as const satisfies PanelRouteDefinition

export const gameSetupRoute = {
  id: 'game-setup',
  path: 'game-setup',
  fullPath: `${panelRootPath}/game-setup`,
  labelKey: 'navigation.items.gameSetup.label',
  descriptionKey: 'navigation.items.gameSetup.description',
  allowedRoles: ['admin'],
} as const satisfies PanelRouteDefinition

export const gameApplicationRoute = {
  id: 'game-application',
  path: 'game-application',
  fullPath: `${panelRootPath}/game-application`,
  labelKey: 'navigation.items.gameApplication.label',
  descriptionKey: 'navigation.items.gameApplication.description',
  allowedRoles: authenticatedPanelRoles,
} as const satisfies PanelRouteDefinition

export const teamRegistrationsRoute = {
  id: 'team-registrations',
  path: 'team-registrations',
  fullPath: `${panelRootPath}/team-registrations`,
  labelKey: 'navigation.items.teamRegistrations.label',
  descriptionKey: 'navigation.items.teamRegistrations.description',
  allowedRoles: ['admin'],
} as const satisfies PanelRouteDefinition

export const panelRoutes = [
  gameBoardRoute,
  gameApplicationRoute,
  gameSetupRoute,
  teamRegistrationsRoute,
] as const satisfies readonly PanelRouteDefinition[]

export const defaultRoute = panelRoutes[0]

type PanelCapability = 'gameSetup' | 'modifierActivation'

const panelCapabilityRoles: Record<PanelCapability, readonly AuthRole[]> = {
  gameSetup: ['admin'],
  modifierActivation: ['admin', 'moderator'],
}

export function hasAccessToPanelRoute(
  route: PanelRouteDefinition,
  roles: readonly AuthRole[] | undefined,
) {
  if (!route.allowedRoles || route.allowedRoles.length === 0) {
    return true
  }

  if (!roles || roles.length === 0) {
    return false
  }

  return roles.some((role) => route.allowedRoles?.includes(role))
}

export function getAccessiblePanelRoutes(roles: readonly AuthRole[] | undefined) {
  return panelRoutes.filter((route) => hasAccessToPanelRoute(route, roles))
}

export function getDefaultPanelRoute(roles: readonly AuthRole[] | undefined) {
  return getAccessiblePanelRoutes(roles)[0] ?? null
}

export function getPanelRouteByPath(pathname: string) {
  return (
    panelRoutes.find(
      (route) => pathname === route.fullPath || pathname.startsWith(`${route.fullPath}/`),
    ) ?? null
  )
}

export function hasPanelCapability(
  capability: PanelCapability,
  roles: readonly AuthRole[] | undefined,
) {
  if (!roles || roles.length === 0) {
    return false
  }

  return roles.some((role) => panelCapabilityRoles[capability].includes(role))
}
