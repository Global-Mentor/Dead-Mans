import { Switch, styled } from '@mui/material'

export const FormSwitch = styled(Switch)(({ theme }) => ({
  '& .MuiSwitch-switchBase.Mui-focusVisible': {
    outline: `2px solid ${theme.palette.primary.light}`,
  },
}))
