import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { useController } from 'react-hook-form'
import type { FormTextFieldProps } from './FormTextField.tsx'
import { FormTextField } from './FormTextField.tsx'

interface ControlledFormTextFieldProps<
  TFieldValues extends FieldValues,
  TTransformedValues extends FieldValues = TFieldValues,
> extends Omit<
  FormTextFieldProps,
  'defaultValue' | 'error' | 'inputRef' | 'name' | 'onBlur' | 'onChange' | 'value'
> {
  control: Control<TFieldValues, unknown, TTransformedValues>
  name: FieldPath<TFieldValues>
}

export function ControlledFormTextField<
  TFieldValues extends FieldValues,
  TTransformedValues extends FieldValues = TFieldValues,
>({
  control,
  helperText,
  name,
  ...props
}: ControlledFormTextFieldProps<TFieldValues, TTransformedValues>) {
  const { field, fieldState } = useController({ control, name })
  const { ref, ...inputField } = field

  return (
    <FormTextField
      {...props}
      {...inputField}
      inputRef={ref}
      value={field.value ?? ''}
      error={fieldState.invalid}
      helperText={fieldState.error?.message ?? helperText}
    />
  )
}
