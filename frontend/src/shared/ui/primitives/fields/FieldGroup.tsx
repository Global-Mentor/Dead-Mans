import { FormControl, FormHelperText, FormLabel, type FormControlProps } from '@mui/material'
import { useId, type ReactNode } from 'react'

interface FieldGroupProps extends FormControlProps {
  label: ReactNode
  labelId?: string
  helperText?: ReactNode
  labelAppearance?: 'standard' | 'overline'
}
export function FieldGroup({
  label,
  labelId,
  helperText,
  labelAppearance = 'standard',
  children,
  ...props
}: FieldGroupProps) {
  const id = useId()
  return (
    <FormControl {...props} aria-describedby={helperText ? `${id}-help` : undefined}>
      <FormLabel
        id={labelId}
        component={props.component === 'fieldset' ? 'legend' : 'label'}
        sx={labelAppearance === 'overline' ? { typography: 'overline', mb: 1.25 } : undefined}
      >
        {label}
      </FormLabel>
      {children}
      {helperText ? <FormHelperText id={`${id}-help`}>{helperText}</FormHelperText> : null}
    </FormControl>
  )
}
