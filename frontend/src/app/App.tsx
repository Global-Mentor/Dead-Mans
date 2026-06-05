import { Suspense, lazy } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from '../layouts/MainLayout.tsx'
import { panelRootPath } from '../routes/app-routes.ts'
import { RequireAuth } from '../shared/auth/RequireAuth.tsx'
import { PanelRoutes } from './routes/PanelRoutes.tsx'

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
        {PanelRoutes()}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
