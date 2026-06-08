import { MenuItem, TextField } from '@mui/material'
import type { TextFieldProps } from '@mui/material'
import type { ReactNode } from 'react'

interface FormSelectOption<TValue extends string | number> {
  value: TValue
  label: ReactNode
}

interface FormSelectProps<TValue extends string | number>
  extends Omit<TextFieldProps, 'select' | 'value' | 'onChange'> {
  value: TValue
  options: readonly FormSelectOption<TValue>[]
  onChange: (value: TValue) => void
  ariaLabel?: string
}

export function FormSelect<TValue extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  ...props
}: FormSelectProps<TValue>) {
  return (
    <TextField
      {...props}
      select
      size={props.size ?? 'small'}
      fullWidth={props.fullWidth ?? true}
      value={value}
      SelectProps={
        ariaLabel
          ? {
              inputProps: {
                'aria-label': ariaLabel,
              },
            }
          : undefined
      }
      onChange={(event) => onChange(event.target.value as TValue)}
    >
      {options.map((option) => (
        <MenuItem key={String(option.value)} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  )
}

