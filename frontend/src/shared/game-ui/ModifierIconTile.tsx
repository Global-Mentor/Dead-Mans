import { Box } from '@mui/material'

export function ModifierIconTile({
  emoji,
  size = 'standard',
}: {
  emoji: string | null | undefined
  size?: 'standard' | 'large'
}) {
  return (
    <Box
      aria-hidden
      component="span"
      sx={{
        width: size === 'large' ? 40 : 32,
        height: size === 'large' ? 40 : 32,
        boxSizing: 'border-box',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        color: 'text.secondary',
        fontSize: size === 'large' ? 21 : 17,
        lineHeight: 1,
      }}
    >
      {emoji || '◇'}
    </Box>
  )
}
