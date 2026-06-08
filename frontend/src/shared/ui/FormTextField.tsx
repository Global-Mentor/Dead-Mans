import { TextField } from '@mui/material'
import type { TextFieldProps } from '@mui/material'

export function FormTextField(props: TextFieldProps) {
  return <TextField size={props.size ?? 'small'} fullWidth={props.fullWidth ?? true} {...props} />
}

