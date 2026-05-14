import { getAccessiblePanelRoutes } from './app-routes.ts'
import { useAuth } from '../shared/auth/use-auth.ts'

export function useAccessiblePanelRoutes() {
  const { user } = useAuth()

  return getAccessiblePanelRoutes(user?.roles)
}
