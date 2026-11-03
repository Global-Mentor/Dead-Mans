import { Box } from '@mui/material'
import { alpha } from '@mui/material/styles'

export function ChoiceMarker({
  children,
  decorative = false,
}: {
  children: string
  decorative?: boolean
}) {
  return (
    <Box
      component="span"
      aria-hidden={decorative || undefined}
      sx={(theme) => ({
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        width: 28,
        height: 28,
        fontSize: '0.875rem',
        lineHeight: 1,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: theme.palette.primary.light,
        border: `1px solid ${alpha(theme.palette.primary.light, 0.35)}`,
        backgroundColor: alpha(theme.palette.common.black, 0.2),
      })}
    >
      {children}
    </Box>
  )
}
