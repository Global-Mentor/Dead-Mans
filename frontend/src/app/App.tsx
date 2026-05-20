import { Suspense, lazy } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from '../layouts/MainLayout.tsx'
import { GameBoardRealtimeSync } from '../features/game-board/realtime/GameBoardRealtimeSync.tsx'
import { gameBoardRoute, gameSetupRoute, panelRootPath } from '../routes/app-routes.ts'
import { PanelIndexRedirect } from '../routes/PanelIndexRedirect.tsx'
import { RequirePanelRouteAccess } from '../routes/RequirePanelRouteAccess.tsx'
import { RequireAuth } from '../shared/auth/RequireAuth.tsx'

const AuthLandingPage = lazy(() =>
  import('../features/auth/AuthLandingPage.tsx').then((module) => ({
    default: module.AuthLandingPage,
  })),
)
const TwitchAuthCallbackPage = lazy(() =>
  import('../features/auth/TwitchAuthCallbackPage.tsx').then((module) => ({
    default: module.TwitchAuthCallbackPage,
  })),
)
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

function AppFallback() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress size={28} />
    </Box>
  )
}

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

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={<AppFallback />}>
            <AuthLandingPage />
          </Suspense>
        }
      />
      <Route
        path="/auth/callback"
        element={
          <Suspense fallback={<AppFallback />}>
            <TwitchAuthCallbackPage />
          </Suspense>
        }
      />
      <Route
        path={panelRootPath}
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
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
          path={gameSetupRoute.path}
          element={
            <RequirePanelRouteAccess route={gameSetupRoute}>
              <Suspense fallback={<PanelRouteFallback />}>
                <GameSetupPage />
              </Suspense>
            </RequirePanelRouteAccess>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
