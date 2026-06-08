import { Paper } from '@mui/material'
import type { PaperProps } from '@mui/material'
import { uiTokens } from '../theme/tokens.ts'

interface SectionCardProps extends PaperProps {
  inset?: boolean
  variantStyle?: 'default' | 'inset' | 'dashed'
}

export function SectionCard({ inset = false, variantStyle = 'default', sx, ...props }: SectionCardProps) {
  const isInset = inset || variantStyle === 'inset'
  const isDashed = variantStyle === 'dashed'

  return (
    <Paper
      variant="outlined"
      {...props}
      sx={{
        p: uiTokens.spacing.section,
        borderRadius: (theme) => theme.shape.borderRadius,
        ...(isInset ? { backgroundColor: 'action.hover' } : undefined),
        ...(isDashed
          ? {
              borderStyle: 'dashed',
              opacity: 0.92,
            }
          : undefined),
        ...sx,
      }}
    />
  )
}

