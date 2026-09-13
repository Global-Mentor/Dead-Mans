import { TextField, Tooltip } from '@mui/material'
import type { OutlinedTextFieldProps, SxProps, Theme } from '@mui/material'
import { useState } from 'react'

type FormFieldLayout = 'default' | 'compact' | 'centered'

export interface FormTextFieldProps extends Omit<OutlinedTextFieldProps, 'variant'> {
  layout?: FormFieldLayout
  variant?: 'outlined'
  validationHint?: string | null
  onValidationHintClose?: () => void
}

function resolveLayoutSx(layout: FormFieldLayout): SxProps<Theme> | undefined {
  switch (layout) {
    case 'compact':
      return {
        '& .MuiInputBase-input': { py: 0.3, fontSize: 12 },
      }
    case 'centered':
      return {
        '& .MuiInputBase-input': { textAlign: 'center', fontWeight: 600 },
      }
    default:
      return undefined
  }
}

export function FormTextField({
  layout = 'default',
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
  const layoutSx = resolveLayoutSx(layout)
  const mergedSx: SxProps<Theme> = [
    ...(Array.isArray(layoutSx) ? layoutSx : layoutSx ? [layoutSx] : []),
    ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
  ]
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
        {...(mergedSx ? { sx: mergedSx } : {})}
      />
    </Tooltip>
  )
}
