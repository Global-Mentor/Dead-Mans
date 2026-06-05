import { Suspense, lazy } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { Route } from 'react-router-dom'
import {
  gameApplicationRoute,
  gameBoardRoute,
  gameSetupRoute,
  teamRegistrationsRoute,
} from '../../routes/app-routes.ts'
import { PanelIndexRedirect } from '../../routes/PanelIndexRedirect.tsx'
import { RequirePanelRouteAccess } from '../../routes/RequirePanelRouteAccess.tsx'
import { GameBoardRealtimeSync } from '../../features/game-board/realtime/GameBoardRealtimeSync.tsx'
import { GameSetupRealtimeSync } from '../../features/game-setup/realtime/GameSetupRealtimeSync.tsx'

const GameBoardPage = lazy(() =>
  import('../../features/game-board/GameBoardPage.tsx').then((module) => ({
    default: module.GameBoardPage,
  })),
)
const GameSetupPage = lazy(() =>
  import('../../features/game-setup/GameSetupPage.tsx').then((module) => ({
    default: module.GameSetupPage,
  })),
)
const GameApplicationPage = lazy(() =>
  import('../../features/game-application/GameApplicationPage.tsx').then((module) => ({
    default: module.GameApplicationPage,
  })),
)
const TeamRegistrationsPage = lazy(() =>
  import('../../features/team-registrations/TeamRegistrationsPage.tsx').then((module) => ({
    default: module.TeamRegistrationsPage,
  })),
)

function PanelRouteFallback() {
  return (
    <Box
      sx={{
        minHeight: 240,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress size={28} />
    </Box>
  )
}

export function PanelRoutes() {
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
