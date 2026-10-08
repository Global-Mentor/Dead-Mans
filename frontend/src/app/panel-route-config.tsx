import type { ComponentType, LazyExoticComponent } from 'react'
import { lazyPanelPage } from './lazy-panel-page.ts'
import { featureTranslationBundles as translations } from '../locales/feature-locale-loader.ts'
import { panelRoutes, type PanelRouteDefinition } from './panel-route-metadata.ts'

type PanelRoutePage = LazyExoticComponent<ComponentType>

type PanelRouteConfigEntry = PanelRouteDefinition & {
  Page: PanelRoutePage
  Sync?: ComponentType
}

const panelPages = {
  'game-history': lazyPanelPage(
    () => import('../features/game-history/GameHistoryPage.tsx'),
    'GameHistoryPage',
    [translations.gameHistory, translations.gameBoard],
  ),
  'modifier-history': lazyPanelPage(
    () => import('../features/modifier-history/ModifierHistoryPage.tsx'),
    'ModifierHistoryPage',
    [translations.modifierHistory],
  ),
  'game-leaderboard': lazyPanelPage(
    () => import('../features/game-history/GameHistoryPage.tsx'),
    'CurrentGameLeaderboardPage',
    [translations.gameHistory],
  ),
  'game-board': lazyPanelPage(
    () => import('../features/game-board/GameBoardPage.tsx'),
    'GameBoardPage',
    [
      translations.gameBoard,
      translations.gameModifiers,
      translations.gameQuiz,
      translations.gameCatalog,
      translations.gameHistory,
      translations.gameRegistration,
    ],
  ),
  'game-round': lazyPanelPage(
    () => import('../features/game-board/GameRoundPage.tsx'),
    'GameRoundPage',
    [
      translations.gameBoard,
      translations.gameModifiers,
      translations.gameCatalog,
      translations.gameQuiz,
      translations.gameHistory,
    ],
  ),
  'game-team-queue': lazyPanelPage(
    () => import('../features/game-board/GameTeamQueuePage.tsx'),
    'GameTeamQueuePage',
    [translations.gameBoard],
  ),
  'game-application': lazyPanelPage(
    () => import('../features/game-application/GameApplicationPage.tsx'),
    'GameApplicationPage',
    [translations.gameApplication, translations.gameRegistration],
  ),
  'game-modifiers': lazyPanelPage(
    () => import('../features/game-modifiers/GameModifiersPage.tsx'),
    'GameModifiersPage',
    [
      translations.gameQuiz,
      translations.gameModifiers,
      translations.gameCatalog,
      translations.gameBoard,
      translations.gameHistory,
      translations.gameRegistration,
    ],
  ),
  'game-quiz': lazyPanelPage(
    () => import('../features/game-quiz/GameQuizPage.tsx'),
    'GameQuizPage',
    [translations.gameQuiz],
  ),
  'game-setup': lazyPanelPage(
    () => import('../features/game-setup/GameSetupPage.tsx'),
    'GameSetupPage',
    [translations.gameSetup, translations.gameCatalog],
  ),
  'admin-modifiers': lazyPanelPage(
    () => import('../features/game-setup/AdminGameModifiersPage.tsx'),
    'AdminGameModifiersPage',
    [translations.gameSetup, translations.gameCatalog, translations.gameModifiers],
  ),
  'admin-questions': lazyPanelPage(
    () => import('../features/game-setup/AdminGameQuestionsPage.tsx'),
    'AdminGameQuestionsPage',
    [translations.gameSetup, translations.gameCatalog],
  ),
  'catalog-modifiers': lazyPanelPage(
    () => import('../features/game-catalog/CatalogModifiersPage.tsx'),
    'CatalogModifiersPage',
    [translations.gameCatalog, translations.gameModifiers],
  ),
  'catalog-questions': lazyPanelPage(
    () => import('../features/game-catalog/CatalogQuestionsPage.tsx'),
    'CatalogQuestionsPage',
    [translations.gameCatalog],
  ),
  'team-registrations': lazyPanelPage(
    () => import('../features/team-registrations/TeamRegistrationsPage.tsx'),
    'TeamRegistrationsPage',
    [
      translations.teamRegistrations,
      translations.gameApplication,
      translations.gameRegistration,
      translations.gameBoard,
    ],
  ),
  'role-administration': lazyPanelPage(
    () => import('../features/role-administration/RoleAdministrationPage.tsx'),
    'RoleAdministrationPage',
    [translations.roleAdministration],
  ),
} as const satisfies Record<(typeof panelRoutes)[number]['id'], PanelRoutePage>

const gameSetupRealtimeSync = lazyPanelPage(
  () => import('../features/game-setup/realtime/GameSetupRealtimeSync.tsx'),
  'GameSetupRealtimeSync',
)

const gameHistoryRealtimeSync = lazyPanelPage(
  () => import('../features/game-history/GameHistoryRealtimeSync.tsx'),
  'GameHistoryRealtimeSync',
)

const panelSyncComponents = {
  'game-history': gameHistoryRealtimeSync,
  'game-leaderboard': gameHistoryRealtimeSync,
  'game-modifiers': lazyPanelPage(
    () => import('../features/game-modifiers/realtime/GameModifiersRealtimeSync.tsx'),
    'GameModifiersRealtimeSync',
  ),
  'game-setup': gameSetupRealtimeSync,
  'admin-questions': gameSetupRealtimeSync,
  'admin-modifiers': gameSetupRealtimeSync,
} as const satisfies Partial<Record<(typeof panelRoutes)[number]['id'], ComponentType>>

export const panelRouteConfig = panelRoutes.map((definition) => ({
  ...definition,
  Page: panelPages[definition.id as keyof typeof panelPages],
  ...(definition.id in panelSyncComponents
    ? { Sync: panelSyncComponents[definition.id as keyof typeof panelSyncComponents] }
    : {}),
})) satisfies readonly PanelRouteConfigEntry[]
