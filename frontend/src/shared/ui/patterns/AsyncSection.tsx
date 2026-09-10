import { Alert, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface AsyncSectionProps {
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
  loadingMessage: string
  errorMessage: string
  emptyMessage: string
  children: ReactNode
}

export function AsyncSection({
  isLoading,
  isError,
  isEmpty,
  loadingMessage,
  errorMessage,
  emptyMessage,
  children,
}: AsyncSectionProps) {
  if (isLoading) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        {loadingMessage}
      </Typography>
    )
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ mt: 1.5 }}>
        {errorMessage}
      </Alert>
    )
  }

  if (isEmpty) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        {emptyMessage}
      </Typography>
    )
  }

  return <>{children}</>
}
