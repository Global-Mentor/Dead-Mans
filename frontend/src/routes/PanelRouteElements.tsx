import { Suspense, lazy } from 'react'
import { Route } from 'react-router-dom'
import {
  gameApplicationRoute,
  gameBoardRoute,
  gameSetupRoute,
  teamRegistrationsRoute,
} from './app-routes.ts'
import { PanelIndexRedirect } from './PanelIndexRedirect.tsx'
import { RequirePanelRouteAccess } from './RequirePanelRouteAccess.tsx'
import { GameBoardRealtimeSync } from '../features/game-board/realtime/GameBoardRealtimeSync.tsx'
import { GameSetupRealtimeSync } from '../features/game-setup/realtime/GameSetupRealtimeSync.tsx'
import { CenteredProgress } from '../shared/ui/CenteredProgress.tsx'

const GameBoardPage = lazy(() =>
  import('../features/game-board/GameBoardPage.tsx').then((module) => ({
    default: module.GameBoardPage,
  })),
)
const GameSetupPage = lazy(() =>
  import('../features/game-setup/GameSetupPage.tsx').then((module) => ({
    default: module.GameSetupPage,
  })),
)
const GameApplicationPage = lazy(() =>
  import('../features/game-application/GameApplicationPage.tsx').then((module) => ({
    default: module.GameApplicationPage,
  })),
)
const TeamRegistrationsPage = lazy(() =>
  import('../features/team-registrations/TeamRegistrationsPage.tsx').then((module) => ({
    default: module.TeamRegistrationsPage,
  })),
)

function PanelRouteFallback() {
  return <CenteredProgress minHeight={240} />
}

export function PanelRouteElements() {
  return (
    <>
      <Route index element={<PanelIndexRedirect />} />
      <Route
        path={gameBoardRoute.path}
        element={
          <RequirePanelRouteAccess route={gameBoardRoute}>
            <GameBoardRealtimeSync />
            <Suspense fallback={<PanelRouteFallback />}>
              <GameBoardPage />
            </Suspense>
          </RequirePanelRouteAccess>
        }
      />
      <Route
        path={gameApplicationRoute.path}
        element={
          <RequirePanelRouteAccess route={gameApplicationRoute}>
            <Suspense fallback={<PanelRouteFallback />}>
              <GameApplicationPage />
            </Suspense>
          </RequirePanelRouteAccess>
        }
      />
      <Route
        path={gameSetupRoute.path}
        element={
          <RequirePanelRouteAccess route={gameSetupRoute}>
            <GameSetupRealtimeSync />
            <Suspense fallback={<PanelRouteFallback />}>
              <GameSetupPage />
            </Suspense>
          </RequirePanelRouteAccess>
        }
      />
      <Route
        path={teamRegistrationsRoute.path}
        element={
          <RequirePanelRouteAccess route={teamRegistrationsRoute}>
            <Suspense fallback={<PanelRouteFallback />}>
              <TeamRegistrationsPage />
            </Suspense>
          </RequirePanelRouteAccess>
        }
      />
    </>
  )
}

