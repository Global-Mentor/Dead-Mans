import type { SxProps, Theme } from '@mui/material'

export const gameSetupSidebarPaperSx: SxProps<Theme> = {
  width: { xs: '100%', md: 280 },
  flexShrink: 0,
  p: 2.5,
  borderRadius: 2,
  alignSelf: 'stretch',
  background:
    'linear-gradient(180deg, rgba(144,202,249,0.08) 0%, rgba(20,24,41,0.98) 100%)',
}
