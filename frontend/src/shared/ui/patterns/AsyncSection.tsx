import { Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { InlineNotice } from '../feedback/messages/InlineNotice.tsx'

interface AsyncSectionProps {
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
  loadingMessage: string
  errorMessage: string
  emptyMessage: string
  children: ReactNode
  hasData?: boolean
  retryAction?: ReactNode
}

export function AsyncSection({
  isLoading,
  isError,
  isEmpty,
  loadingMessage,
  errorMessage,
  emptyMessage,
  children,
  hasData = false,
  retryAction,
}: AsyncSectionProps) {
  if (isLoading && !hasData)
    return (
      <Typography role="status" variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        {loadingMessage}
      </Typography>
    )
  if (isError && !hasData)
    return (
      <InlineNotice severity="error" action={retryAction} sx={{ mt: 1.5 }}>
        {errorMessage}
      </InlineNotice>
    )
  return (
    <>
      {isError ? (
        <InlineNotice severity="warning" action={retryAction} sx={{ mb: 1.5 }}>
          {errorMessage}
        </InlineNotice>
      ) : null}
      {isEmpty ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {emptyMessage}
        </Typography>
      ) : (
        children
      )}
    </>
  )
}
