import { FormControlLabel, styled } from '@mui/material'

export const ChoiceLabel = styled(FormControlLabel)({
  minWidth: 0,
  '& .MuiFormControlLabel-label': { minWidth: 0, overflowWrap: 'anywhere' },
})
