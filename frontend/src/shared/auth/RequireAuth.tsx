import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './use-auth.ts'
import { CenteredProgress } from '../ui/CenteredProgress.tsx'

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, authStatus } = useAuth()
  const { t } = useTranslation()

  if (authStatus === 'checking') {
    return <CenteredProgress minHeight="100vh" message={t('auth.checkingSession')} />
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
