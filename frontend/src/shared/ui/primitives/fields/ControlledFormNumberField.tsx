import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { FormNumberField, type FormNumberFieldProps } from './FormNumberField.tsx'

interface ControlledFormNumberFieldProps<
  T extends FieldValues,
  R extends FieldValues = T,
> extends Omit<
  FormNumberFieldProps,
  'value' | 'onValueChange' | 'name' | 'inputRef' | 'onBlur' | 'error'
> {
  control: Control<T, unknown, R>
  name: FieldPath<T>
}

export function ControlledFormNumberField<T extends FieldValues, R extends FieldValues = T>({
  control,
  name,
  helperText,
  ...props
}: ControlledFormNumberFieldProps<T, R>) {
  const { field, fieldState } = useController({ control, name })
  return (
    <FormNumberField
      {...props}
      name={field.name}
      inputRef={field.ref}
      onBlur={field.onBlur}
      value={field.value ?? ''}
      onValueChange={field.onChange}
      error={fieldState.invalid}
      helperText={fieldState.error?.message ?? helperText}
    />
  )
}
