import type { SelectProps } from '@mui/material'
import { alpha, MenuItem, Select } from '@mui/material'
import type { ChangeEvent, ReactNode } from 'react'
import { createContext, forwardRef, useContext } from 'react'
import { mergeSx } from '../../../theme/merge-sx.ts'
import type { FormTextFieldProps } from '../fields/FormTextField.tsx'
import { FormTextField } from '../fields/FormTextField.tsx'

interface FormSelectOption<TValue extends string | number> {
  value: TValue
  label: ReactNode
}

const OptionsContext = createContext<readonly FormSelectOption<string | number>[]>([])

// Native mode is resolved by TextField's slot API, including owner-state callbacks.
// Render options at that boundary so labels, the select and its children use one mode.
const OptionsSelect = forwardRef<HTMLDivElement, SelectProps>(function OptionsSelect(props, ref) {
  const options = useContext(OptionsContext)
  return (
    <Select {...props} ref={ref}>
      {options.map((option) =>
        props.native ? (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ) : (
          <MenuItem key={String(option.value)} value={option.value}>
            {option.label}
          </MenuItem>
        ),
      )}
    </Select>
  )
})

interface FormSelectProps<TValue extends string | number> extends Omit<
  FormTextFieldProps,
  'select' | 'value' | 'onChange'
> {
  value: TValue
  options: readonly FormSelectOption<TValue>[]
  onChange: (value: TValue) => void
  ariaLabel?: string
  appearance?: 'standard' | 'toolbar'
}

export function FormSelect<TValue extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  appearance = 'standard',
  density,
  sx,
  SelectProps,
  InputLabelProps,
  slotProps,
  ...props
}: FormSelectProps<TValue>) {
  return (
    <OptionsContext.Provider value={options}>
      <FormTextField
        {...props}
        select
        density={density ?? (appearance === 'toolbar' ? 'compact' : 'standard')}
        sx={mergeSx(
          appearance === 'toolbar'
            ? (theme) => ({
                minWidth: 70,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(theme.palette.primary.main, 0.35),
                },
              })
            : undefined,
          sx,
        )}
        slots={{ ...props.slots, select: OptionsSelect }}
        value={value}
        slotProps={{
          ...slotProps,
          select: (ownerState) => {
            const supplied = slotProps?.select
            const resolved = typeof supplied === 'function' ? supplied(ownerState) : supplied
            return {
              ...SelectProps,
              ...resolved,
              inputProps: {
                ...SelectProps?.inputProps,
                ...resolved?.inputProps,
                ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
              },
            }
          },
          inputLabel: (ownerState) => {
            const labelProps = slotProps?.inputLabel ?? InputLabelProps
            const supplied = slotProps?.select
            const resolved = typeof supplied === 'function' ? supplied(ownerState) : supplied
            const merged: Partial<SelectProps> = { ...SelectProps, ...resolved }
            const native = merged.native

            return {
              ...(typeof labelProps === 'function' ? labelProps(ownerState) : labelProps),
              // The custom Select is a div: MUI links its accessible name through labelId.
              ...(!native ? { component: 'span', htmlFor: undefined } : {}),
            }
          },
        }}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const selected = options.find(
            (option) => String(option.value) === String(event.target.value),
          )
          onChange(selected ? selected.value : (event.target.value as TValue))
        }}
      />
    </OptionsContext.Provider>
  )
}
