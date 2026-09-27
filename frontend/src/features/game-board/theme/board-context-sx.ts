import { alpha, type Theme } from '@mui/material/styles'

export function boardContextSurfaceSx(theme: Theme) {
  return {
    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
    borderRadius: 0,
    background: `linear-gradient(110deg, ${alpha(theme.palette.primary.main, 0.09)}, ${alpha(theme.palette.background.paper, 0.88)} 60%)`,
    boxShadow: `inset 0 1px 0 ${alpha(theme.palette.primary.light, 0.06)}`,
  }
}
