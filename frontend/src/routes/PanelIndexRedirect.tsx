import { Navigate } from 'react-router-dom'
import { useAccessiblePanelRoutes } from './use-accessible-panel-routes.ts'

export function PanelIndexRedirect() {
  const accessibleRoutes = useAccessiblePanelRoutes()
  const defaultRoute = accessibleRoutes[0]

  if (!defaultRoute) {
    return <Navigate to="/" replace />
  }

  return <Navigate to={defaultRoute.fullPath} replace />
}
