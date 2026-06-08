import type { ComponentType, LazyExoticComponent } from 'react'
import { lazy } from 'react'
import type { AuthRole } from '../shared/api/contracts/index.ts'
import { GameBoardRealtimeSync } from '../features/game-board/realtime/GameBoardRealtimeSync.tsx'
import { GameSetupRealtimeSync } from '../features/game-setup/realtime/GameSetupRealtimeSync.tsx'

export const panelRootPath = '/panel'

const authenticatedPanelRoles = ['viewer', 'moderator', 'admin'] as const satisfies readonly AuthRole[]

export type PanelRoutePage = LazyExoticComponent<ComponentType<unknown>>

export type PanelRouteDefinition = {
  id: string
  path: string
  fullPath: string
  labelKey: string
  descriptionKey?: string
  allowedRoles?: readonly AuthRole[]
}

type PanelRouteConfigInput = Omit<PanelRouteDefinition, 'fullPath'> & {
  Page: PanelRoutePage
  Sync?: ComponentType
}

export type PanelRouteConfigEntry = PanelRouteDefinition & {
  Page: PanelRoutePage
  Sync?: ComponentType
}

function createPanelRouteEntry(entry: PanelRouteConfigInput): PanelRouteConfigEntry {
  return {
    ...entry,
    fullPath: `${panelRootPath}/${entry.path}`,
  }
}

function definePanelRouteConfig<const T extends readonly PanelRouteConfigEntry[]>(
  config: T,
): T {
  return config
}

export const panelRouteConfig = definePanelRouteConfig([
  createPanelRouteEntry({
    id: 'game-board',
    path: 'game-board',
    labelKey: 'navigation.items.gameBoard.label',
    descriptionKey: 'navigation.items.gameBoard.description',
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
    descriptionKey: 'navigation.items.gameApplication.description',
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
    descriptionKey: 'navigation.items.gameSetup.description',
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
    descriptionKey: 'navigation.items.teamRegistrations.description',
    allowedRoles: ['admin'],
    Page: lazy(() =>
      import('../features/team-registrations/TeamRegistrationsPage.tsx').then((module) => ({
        default: module.TeamRegistrationsPage,
      })),
    ),
  }),
])

export type PanelRouteId = (typeof panelRouteConfig)[number]['id']

export type PanelRouteMetadata = Omit<PanelRouteConfigEntry, 'Page' | 'Sync'> & {
  id: PanelRouteId
}

function toPanelRouteMetadata(entry: (typeof panelRouteConfig)[number]): PanelRouteMetadata {
  return {
    id: entry.id,
    path: entry.path,
    fullPath: entry.fullPath,
    labelKey: entry.labelKey,
    descriptionKey: entry.descriptionKey,
    allowedRoles: entry.allowedRoles,
  }
}

export const panelRoutes = panelRouteConfig.map(toPanelRouteMetadata)

const panelRouteById = Object.fromEntries(
  panelRoutes.map((route) => [route.id, route]),
) as Record<PanelRouteId, PanelRouteMetadata>

export const gameBoardRoute = panelRouteById['game-board']
export const gameApplicationRoute = panelRouteById['game-application']
export const gameSetupRoute = panelRouteById['game-setup']
export const teamRegistrationsRoute = panelRouteById['team-registrations']

export const defaultRoute = panelRoutes[0]
