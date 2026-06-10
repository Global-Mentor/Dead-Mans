import { Box } from '@mui/material'
import type { BoxProps, SxProps, Theme } from '@mui/material'
import { pageShellSx, setupSplitLayoutSx } from '../../theme/layout-sx.ts'

type PageShellVariant = 'standard' | 'centered' | 'split'

interface PageShellProps extends BoxProps {
  variant?: PageShellVariant
}

function resolveVariantSx(variant: PageShellVariant): BoxProps['sx'] {
  switch (variant) {
    case 'centered':
      return {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 1, sm: 2 },
      }
    case 'split':
      return setupSplitLayoutSx
    default:
      return pageShellSx
  }
}

export function PageShell({ variant = 'standard', sx, ...props }: PageShellProps) {
  const variantSx = resolveVariantSx(variant)
  const mergedSx = sx ? ([variantSx, sx].filter(Boolean) as SxProps<Theme>) : variantSx
  return <Box {...props} sx={mergedSx} />
}
