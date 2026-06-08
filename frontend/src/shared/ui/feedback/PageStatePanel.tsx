import { CircularProgress, Stack, Typography } from '@mui/material'
import { SectionCard } from '../primitives/SectionCard.tsx'

interface PageStatePanelProps {
  title?: string
  message: string
  tone?: 'default' | 'error'
  showSpinner?: boolean
}

export function PageStatePanel({
  title,
  message,
  tone = 'default',
  showSpinner = false,
}: PageStatePanelProps) {
  return (
    <SectionCard>
      <Stack spacing={title ? 1 : 0} alignItems={showSpinner ? 'center' : 'stretch'}>
        {showSpinner ? <CircularProgress size={28} /> : null}
        {title ? <Typography variant="h6">{title}</Typography> : null}
        <Typography
          variant="body2"
          color={tone === 'error' ? 'error' : 'text.secondary'}
          textAlign={showSpinner ? 'center' : 'left'}
        >
          {message}
        </Typography>
      </Stack>
    </SectionCard>
  )
}
