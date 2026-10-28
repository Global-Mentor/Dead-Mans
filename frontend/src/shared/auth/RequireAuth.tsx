import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './use-auth.ts'
import { getSignInPath } from './login-return-to.ts'
import { CenteredProgress } from '../ui/index.ts'

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, authStatus } = useAuth()
  const location = useLocation()
  const { t } = useTranslation()

  if (authStatus === 'checking') {
    return <CenteredProgress minHeight="100vh" message={t('auth.checkingSession')} />
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={getSignInPath(`${location.pathname}${location.search}${location.hash}`)}
        replace
      />
    )
  }

  return <>{children}</>
}
