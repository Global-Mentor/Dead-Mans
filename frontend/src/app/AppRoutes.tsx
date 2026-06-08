import { useRoutes } from 'react-router-dom'
import { appRoutes } from './app-route-tree.tsx'

export function AppRoutes() {
  return useRoutes(appRoutes)
}
