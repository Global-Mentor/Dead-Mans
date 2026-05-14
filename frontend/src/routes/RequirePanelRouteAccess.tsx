import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { PanelRouteDefinition } from './app-routes.ts'
import { hasAccessToPanelRoute } from './app-routes.ts'
import { useAccessiblePanelRoutes } from './use-accessible-panel-routes.ts'
import { useAuth } from '../shared/auth/use-auth.ts'

interface RequirePanelRouteAccessProps {
  route: PanelRouteDefinition
  children: ReactNode
}

export function RequirePanelRouteAccess({
  route,
  children,
}: RequirePanelRouteAccessProps) {
  const { user } = useAuth()
  const accessibleRoutes = useAccessiblePanelRoutes()
  const fallbackRoute = accessibleRoutes[0]

  if (!user || hasAccessToPanelRoute(route, user.roles)) {
    return <>{children}</>
  }

  if (fallbackRoute && fallbackRoute.fullPath !== route.fullPath) {
    return <Navigate to={fallbackRoute.fullPath} replace />
  }

  return <Navigate to="/" replace />
}
