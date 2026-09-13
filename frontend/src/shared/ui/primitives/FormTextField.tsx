import { TextField, Tooltip } from '@mui/material'
import type { OutlinedTextFieldProps, SxProps, Theme } from '@mui/material'
import { useState } from 'react'
import { mergeSx } from '../../theme/merge-sx.ts'

type FormFieldDensity = 'standard' | 'compact'
type FormFieldTextAlign = 'start' | 'center'

export interface FormTextFieldProps extends Omit<OutlinedTextFieldProps, 'variant'> {
  density?: FormFieldDensity
  textAlign?: FormFieldTextAlign
  variant?: 'outlined'
  validationHint?: string | null
  onValidationHintClose?: () => void
}

function resolveFieldSx(
  density: FormFieldDensity,
  textAlign: FormFieldTextAlign,
): SxProps<Theme> | undefined {
  if (density === 'standard' && textAlign === 'start') return undefined

  return {
    '& .MuiInputBase-input': {
      ...(density === 'compact' ? { py: 0.3, fontSize: 12 } : {}),
      ...(textAlign === 'center' ? { textAlign: 'center', fontWeight: 600 } : {}),
    },
  }
}

export function FormTextField({
  density = 'standard',
  textAlign = 'start',
  sx,
  validationHint,
  onValidationHintClose,
  ...props
}: FormTextFieldProps) {
  const [nativeHint, setNativeHint] = useState<string | null>(null)
  const hint = validationHint || nativeHint
  const closeHint = () => {
    setNativeHint(null)
    onValidationHintClose?.()
  }

  return (
    <Tooltip
      open={Boolean(hint)}
      title={hint ? <span role="alert">{hint}</span> : ''}
      onClose={closeHint}
      arrow
      describeChild
      placement="bottom-start"
      disableFocusListener
      disableHoverListener
      disableTouchListener
    >
      <TextField
        size={props.size ?? 'small'}
        fullWidth={props.fullWidth ?? true}
        {...props}
        onInvalid={(event) => {
          props.onInvalid?.(event)
          if (event.defaultPrevented) return
          const field = event.target as HTMLInputElement | HTMLTextAreaElement
          if (!field.validationMessage) return
          event.preventDefault()
          // Keep the first invalid field focused when the browser validates the whole form.
          const firstInvalid = Array.from(field.form?.elements ?? []).find(
            (element) =>
              (element instanceof HTMLInputElement ||
                element instanceof HTMLTextAreaElement ||
                element instanceof HTMLSelectElement) &&
              element.willValidate &&
              !element.validity.valid,
          )
          if (firstInvalid && firstInvalid !== field) return
          field.focus()
          setNativeHint(field.validationMessage)
        }}
        onChange={(event) => {
          setNativeHint(null)
          props.onChange?.(event)
        }}
        onBlur={(event) => {
          closeHint()
          props.onBlur?.(event)
        }}
        sx={mergeSx(resolveFieldSx(density, textAlign), sx)}
      />
    </Tooltip>
  )
}
