import { Paper } from '@mui/material'
import type { PaperProps } from '@mui/material'
import { uiTokens } from '../theme/tokens.ts'

interface SectionCardProps extends PaperProps {
  inset?: boolean
}

export function SectionCard({ inset = false, sx, ...props }: SectionCardProps) {
  return (
    <Paper
      variant="outlined"
      {...props}
      sx={{
        p: uiTokens.spacing.section,
        borderRadius: uiTokens.borderRadius.md,
        ...(inset ? { backgroundColor: 'action.hover' } : undefined),
        ...sx,
      }}
    />
  )
}

