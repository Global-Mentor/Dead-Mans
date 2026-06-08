import { Paper } from '@mui/material'
import type { PaperProps } from '@mui/material'
import { huntInsetSurfaceSx, huntPanelSx } from '../../theme/surface-sx.ts'
import { uiTokens } from '../../theme/tokens.ts'

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
      sx={[
        (theme) => ({
          p: uiTokens.spacing.section,
          borderRadius: theme.shape.borderRadius,
          ...(isInset ? huntInsetSurfaceSx(theme) : huntPanelSx(theme)),
        }),
        isDashed
          ? {
              borderStyle: 'dashed',
              opacity: 0.94,
            }
          : null,
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  )
}
