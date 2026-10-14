import { Box } from '@mui/material'
import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { lazyPanelPage } from '../app/lazy-panel-page.ts'
import { featureTranslationBundles as translations } from '../locales/feature-locale-loader.ts'
import {
  getPanelRouteByPath,
  gameBoardRoute,
  gameSetupRoute,
  adminModifiersRoute,
  adminQuestionsRoute,
  gameLeaderboardRoute,
  gameHistoryRoute,
  modifierHistoryRoute,
  gameModifiersRoute,
  gameQuizRoute,
  gameTeamQueueRoute,
  roleAdministrationRoute,
  teamRegistrationsRoute,
  catalogModifiersRoute,
  catalogQuestionsRoute,
} from '../routes/app-routes.ts'
import { hasPanelCapability } from '../shared/auth/panel-capabilities.ts'
import { ModifierCatalogRealtimeSync } from '../features/modifier-history/ModifierCatalogRealtimeSync.tsx'
import { useAuth } from '../shared/auth/use-auth.ts'
import { SignalrConnectionProvider } from '../shared/realtime/index.ts'
import { uiTokens } from '../shared/theme/tokens.ts'
import { PanelNavigation } from './PanelNavigation.tsx'
import { GameLifecycleRealtimeSync } from './GameLifecycleRealtimeSync.tsx'

const GameAdminToolsHost = lazyPanelPage(
  () => import('../features/admin-tools/GameAdminToolsHost.tsx'),
  'GameAdminToolsHost',
  [
    translations.gameBoard,
    translations.gameModifiers,
    translations.gameCatalog,
    translations.gameQuiz,
    translations.gameHistory,
    translations.gameRegistration,
  ],
)
const GameBoardQuizRealtimeSync = lazyPanelPage(
  () => import('../features/game-board/realtime/GameBoardQuizRealtimeSync.tsx'),
  'GameBoardQuizRealtimeSync',
)

export function MainLayout() {
  const { user } = useAuth()

  return (
    <SignalrConnectionProvider key={user?.id ?? 'anonymous'}>
      <MainLayoutContent />
    </SignalrConnectionProvider>
  )
}

function MainLayoutContent() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const isAdministration = getPanelRouteByPath(pathname)?.group === 'admin'
  const boundedWorkspace = [
    adminModifiersRoute.fullPath,
    adminQuestionsRoute.fullPath,
    gameSetupRoute.fullPath,
    gameTeamQueueRoute.fullPath,
    gameLeaderboardRoute.fullPath,
    gameHistoryRoute.fullPath,
    modifierHistoryRoute.fullPath,
    roleAdministrationRoute.fullPath,
    teamRegistrationsRoute.fullPath,
    catalogModifiersRoute.fullPath,
    catalogQuestionsRoute.fullPath,
  ].includes(pathname)
  const hasManagementPanel =
    !isAdministration &&
    (hasPanelCapability('startGame', user?.roles) ||
      (hasPanelCapability('manageGame', user?.roles) &&
        [gameBoardRoute.fullPath, gameModifiersRoute.fullPath, gameQuizRoute.fullPath].includes(
          pathname,
        )))
  return (
    <Box
      sx={{
        minHeight: boundedWorkspace ? 0 : '100vh',
        height: boundedWorkspace ? '100dvh' : undefined,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PanelNavigation />
      <ModifierCatalogRealtimeSync />
      <GameLifecycleRealtimeSync />
      <Suspense fallback={null}>
        <GameBoardQuizRealtimeSync />
      </Suspense>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ...(boundedWorkspace ? { flex: '1 1 0%', minHeight: 0 } : {}),
          p: uiTokens.spacing.page,
          pb: {
            xs: hasManagementPanel ? 10 : uiTokens.spacing.page.xs,
            sm: hasManagementPanel ? 10 : uiTokens.spacing.page.sm,
            md: uiTokens.spacing.page.sm,
          },
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        <Outlet />
        {hasManagementPanel ? (
          <Suspense fallback={null}>
            <GameAdminToolsHost />
          </Suspense>
        ) : null}
      </Box>
    </Box>
  )
}
