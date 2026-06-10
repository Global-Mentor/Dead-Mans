import { MenuItem } from '@mui/material'
import type { ChangeEvent, ReactNode } from 'react'
import { FormTextField } from './FormTextField.tsx'
import type { FormTextFieldProps } from './FormTextField.tsx'

interface FormSelectOption<TValue extends string | number> {
  value: TValue
  label: ReactNode
}

interface FormSelectProps<TValue extends string | number> extends Omit<
  FormTextFieldProps,
  'select' | 'value' | 'onChange'
> {
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
    <FormTextField
      {...props}
      select
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
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value as TValue)}
    >
      {options.map((option) => (
        <MenuItem key={String(option.value)} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </FormTextField>
  )
}
