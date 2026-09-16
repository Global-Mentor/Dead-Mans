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
  SelectProps,
  InputLabelProps,
  slotProps,
  ...props
}: FormSelectProps<TValue>) {
  return (
    <FormTextField
      {...props}
      select
      value={value}
      slotProps={{
        ...slotProps,
        inputLabel: (ownerState) => {
          const labelProps = slotProps?.inputLabel ?? InputLabelProps
          const selectProps = slotProps?.select ?? SelectProps
          const native =
            typeof selectProps === 'function' ? selectProps(ownerState).native : selectProps?.native

          return {
            ...(typeof labelProps === 'function' ? labelProps(ownerState) : labelProps),
            // The custom Select is a div: MUI links its accessible name through labelId.
            ...(!native ? { component: 'span', htmlFor: undefined } : {}),
          }
        },
      }}
      SelectProps={{
        ...SelectProps,
        inputProps: {
          ...SelectProps?.inputProps,
          ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
        },
      }}
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
