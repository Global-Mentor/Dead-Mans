import { ButtonBase, styled } from '@mui/material'

/** Keyboard-operable trigger for a composed surface; supports links and forwarded refs. */
export const SurfaceButton = styled(ButtonBase)(({ theme }) => ({
  minWidth: 0,
  textAlign: 'inherit',
  '&.Mui-focusVisible': {
    outline: '2px solid',
    outlineColor: theme.palette.primary.light,
    outlineOffset: 2,
  },
})) as typeof ButtonBase
