import type { ButtonBaseProps } from '@mui/material'
import { alpha, type Theme } from '@mui/material/styles'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { SurfaceButton } from '../../primitives/buttons/SurfaceButton.tsx'

type NavigationLayout = 'route' | 'compact' | 'profile' | 'management' | 'icon'
interface NavigationButtonProps extends ButtonBaseProps {
  active?: boolean
  layout?: NavigationLayout
  to?: string
}
function navigationSx(theme: Theme, active: boolean, layout: NavigationLayout) {
  return {
    position: 'relative',
    minHeight: 44,
    px: 1.25,
    gap: 0.75,
    flexShrink: 0,
    borderRadius: '4px',
    fontFamily: theme.typography.fontFamily ?? 'inherit',
    fontSize: 16,
    fontWeight: active ? 700 : 500,
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    color: active ? theme.palette.text.primary : theme.palette.text.secondary,
    backgroundColor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: 3,
      left: 12,
      right: 12,
      height: 2,
      backgroundColor: active ? theme.palette.primary.main : 'transparent',
    },
    '&:hover': {
      color: theme.palette.text.primary,
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
    },
    '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
    ...(layout === 'compact'
      ? { width: '100%', justifyContent: 'flex-start', px: 1, minWidth: 0 }
      : {}),
    ...(layout === 'profile' ? { maxWidth: 200, minWidth: 44, px: 0.75 } : {}),
    ...(layout === 'management' ? { minWidth: 44, px: { xs: 1.25, lg: 1.5 } } : {}),
    ...(layout === 'icon' ? { width: 44, height: 44 } : {}),
  } as const
}
export function NavigationButton({
  active = false,
  layout = 'route',
  sx,
  ...props
}: NavigationButtonProps) {
  return (
    <SurfaceButton {...props} sx={mergeSx((theme) => navigationSx(theme, active, layout), sx)} />
  )
}
