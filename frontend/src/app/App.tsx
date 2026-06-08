import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from '../layouts/MainLayout.tsx'
import { panelRootPath } from '../routes/app-routes.ts'
import { PanelRouteElements } from '../routes/PanelRouteElements.tsx'
import { RequireAuth } from '../shared/auth/RequireAuth.tsx'
import { CenteredProgress } from '../shared/ui/CenteredProgress.tsx'

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
  return <CenteredProgress minHeight="100vh" />
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
        <PanelRouteElements />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
