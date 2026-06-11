import type { ParseKeys } from 'i18next'
import type { ComponentType, LazyExoticComponent } from 'react'
import { lazy } from 'react'
import type { AuthRole } from '../shared/api/contracts/index.ts'
import { GameBoardRealtimeSync } from '../features/game-board/realtime/GameBoardRealtimeSync.tsx'
import { GameSetupRealtimeSync } from '../features/game-setup/realtime/GameSetupRealtimeSync.tsx'

export const panelRootPath = '/panel'

const authenticatedPanelRoles = [
  'viewer',
  'moderator',
  'admin',
] as const satisfies readonly AuthRole[]

type PanelRoutePage = LazyExoticComponent<ComponentType<unknown>>
type PanelRouteLabelKey = Extract<ParseKeys, `navigation.items.${string}.label`>

export type PanelRouteDefinition = {
  id: string
  path: string
  fullPath: string
  labelKey: PanelRouteLabelKey
  allowedRoles?: readonly AuthRole[]
}

type PanelRouteConfigInput = Omit<PanelRouteDefinition, 'fullPath'> & {
  Page: PanelRoutePage
  Sync?: ComponentType
}

type PanelRouteConfigEntry = PanelRouteDefinition & {
  Page: PanelRoutePage
  Sync?: ComponentType
}

function createPanelRouteEntry(entry: PanelRouteConfigInput): PanelRouteConfigEntry {
  return {
    ...entry,
    fullPath: `${panelRootPath}/${entry.path}`,
  }
}

function definePanelRouteConfig<const T extends readonly PanelRouteConfigEntry[]>(config: T): T {
  return config
}

export const panelRouteConfig = definePanelRouteConfig([
  createPanelRouteEntry({
    id: 'game-board',
    path: 'game-board',
    labelKey: 'navigation.items.gameBoard.label',
    allowedRoles: authenticatedPanelRoles,
    Page: lazy(() =>
      import('../features/game-board/GameBoardPage.tsx').then((module) => ({
        default: module.GameBoardPage,
      })),
    ),
    Sync: GameBoardRealtimeSync,
  }),
  createPanelRouteEntry({
    id: 'game-application',
    path: 'game-application',
    labelKey: 'navigation.items.gameApplication.label',
    allowedRoles: authenticatedPanelRoles,
    Page: lazy(() =>
      import('../features/game-application/GameApplicationPage.tsx').then((module) => ({
        default: module.GameApplicationPage,
      })),
    ),
  }),
  createPanelRouteEntry({
    id: 'game-setup',
    path: 'game-setup',
    labelKey: 'navigation.items.gameSetup.label',
    allowedRoles: ['admin'],
    Page: lazy(() =>
      import('../features/game-setup/GameSetupPage.tsx').then((module) => ({
        default: module.GameSetupPage,
      })),
    ),
    Sync: GameSetupRealtimeSync,
  }),
  createPanelRouteEntry({
    id: 'team-registrations',
    path: 'team-registrations',
    labelKey: 'navigation.items.teamRegistrations.label',
    allowedRoles: ['admin'],
    Page: lazy(() =>
      import('../features/team-registrations/TeamRegistrationsPage.tsx').then((module) => ({
        default: module.TeamRegistrationsPage,
      })),
    ),
  }),
])

type PanelRouteId = (typeof panelRouteConfig)[number]['id']

type PanelRouteMetadata = Omit<PanelRouteConfigEntry, 'Page' | 'Sync'> & {
  id: PanelRouteId
}

function toPanelRouteMetadata(entry: (typeof panelRouteConfig)[number]): PanelRouteMetadata {
  return {
    id: entry.id,
    path: entry.path,
    fullPath: entry.fullPath,
    labelKey: entry.labelKey,
    ...(entry.allowedRoles ? { allowedRoles: entry.allowedRoles } : {}),
  }
}

export const panelRoutes = panelRouteConfig.map(toPanelRouteMetadata)

function requirePanelRoute(routeId: PanelRouteId): PanelRouteMetadata {
  const route = panelRoutes.find(({ id }) => id === routeId)
  if (!route) {
    throw new Error(`Panel route "${routeId}" is not configured`)
  }

  return route
}

export const gameBoardRoute = requirePanelRoute('game-board')
export const gameApplicationRoute = requirePanelRoute('game-application')
export const gameSetupRoute = requirePanelRoute('game-setup')
export const teamRegistrationsRoute = requirePanelRoute('team-registrations')
