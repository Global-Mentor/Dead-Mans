import { Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { InlineNotice } from '../feedback/messages/InlineNotice.tsx'
import { PageStatePanel } from '../feedback/PageStatePanel.tsx'

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
  stateVariant?: 'inline' | 'panel'
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
  stateVariant = 'inline',
}: AsyncSectionProps) {
  if (stateVariant === 'panel' && !hasData && (isLoading || isError)) {
    return (
      <PageStatePanel
        message={isError ? errorMessage : loadingMessage}
        tone={isError ? 'error' : 'default'}
        showSpinner={isLoading && !isError}
        actions={isError ? retryAction : undefined}
      />
    )
  }
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
        stateVariant === 'panel' ? (
          <PageStatePanel message={emptyMessage} />
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {emptyMessage}
          </Typography>
        )
      ) : (
        children
      )}
    </>
  )
}
