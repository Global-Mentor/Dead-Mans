import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ActionIcon } from '../buttons/ActionIcon.tsx'
import { FieldAdornment } from './FieldAdornment.tsx'
import { FormTextField, type FormTextFieldProps } from './FormTextField.tsx'

export interface FormNumberFieldProps extends Omit<
  FormTextFieldProps,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'inputProps' | 'slotProps' | 'multiline'
> {
  label: string
  value: string | number
  onValueChange: (value: string) => void
  min?: number
  max?: number | undefined
}

/** Integer quantities; keep empty and invalid manual input available to form validation. */
export function FormNumberField({
  value,
  onValueChange,
  min = 0,
  max,
  label,
  disabled,
  ...props
}: FormNumberFieldProps) {
  const { t } = useTranslation()
  const current = value === '' ? null : Number(value)
  const base = current !== null && Number.isFinite(current) ? current : min
  const nextValue = (direction: -1 | 1) =>
    Math.min(
      max ?? Infinity,
      Math.max(
        min,
        current === null ? min : direction > 0 ? Math.floor(base) + 1 : Math.ceil(base) - 1,
      ),
    )
  return (
    <FormTextField
      {...props}
      label={label}
      disabled={disabled}
      type="number"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      inputProps={{ min, max, step: 1, inputMode: 'numeric' }}
      slotProps={{
        input: {
          endAdornment: (
            <FieldAdornment position="end">
              <ActionIcon
                aria-label={t('common.actions.decreaseValue', { field: label })}
                disabled={disabled || (current !== null && current <= min)}
                onClick={() => onValueChange(String(nextValue(-1)))}
              >
                <Box component="span" aria-hidden>
                  −
                </Box>
              </ActionIcon>
              <ActionIcon
                aria-label={t('common.actions.increaseValue', { field: label })}
                disabled={disabled || (current !== null && max !== undefined && current >= max)}
                onClick={() => onValueChange(String(nextValue(1)))}
              >
                <Box component="span" aria-hidden>
                  +
                </Box>
              </ActionIcon>
            </FieldAdornment>
          ),
        },
      }}
    />
  )
}
