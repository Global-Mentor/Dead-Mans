import { Paper } from '@mui/material'
import type { PaperProps } from '@mui/material'
import { mergeSx } from '../../theme/merge-sx.ts'
import { getAppSurfaceSx } from '../../theme/surface-sx.ts'
import type { AppSurface } from '../../theme/surface-sx.ts'
import { uiTokens } from '../../theme/tokens.ts'

interface SectionCardProps extends Omit<PaperProps, 'elevation' | 'variant'> {
  surface?: AppSurface
  borderStyle?: 'solid' | 'dashed'
}

export function SectionCard({
  surface = 'panel',
  borderStyle = 'solid',
  sx,
  ...props
}: SectionCardProps) {
  return (
    <Paper
      {...props}
      elevation={0}
      sx={mergeSx(
        (theme) => ({
          p: uiTokens.spacing.section,
          borderRadius: theme.shape.borderRadius,
          ...getAppSurfaceSx(theme, surface),
          borderStyle,
        }),
        borderStyle === 'dashed' ? { opacity: 0.94 } : null,
        sx,
      )}
    />
  )
}
