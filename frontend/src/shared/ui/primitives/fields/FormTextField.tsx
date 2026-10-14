import type { OutlinedTextFieldProps, SxProps, Theme } from '@mui/material'
import { TextField } from '@mui/material'
import { useId, useState } from 'react'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { uiTokens } from '../../../theme/tokens.ts'
import { HelpTooltip } from '../../feedback/help/HelpTooltip.tsx'

type FormFieldDensity = 'standard' | 'compact'
type FormFieldTextAlign = 'start' | 'center'

export interface FormTextFieldProps extends Omit<OutlinedTextFieldProps, 'variant'> {
  layout?: 'standard' | 'matrixColumn' | 'matrixRow'
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
      ...(density === 'compact'
        ? { py: 0.75, fontSize: uiTokens.type.secondary, lineHeight: 1.5 }
        : {}),
      ...(textAlign === 'center' ? { textAlign: 'center', fontWeight: 600 } : {}),
    },
    ...(density === 'compact'
      ? {
          '& .MuiInputBase-root': { minHeight: uiTokens.control.height.compact },
          '& .MuiInputLabel-root': {
            fontSize: uiTokens.type.secondary,
            '&:not(.MuiInputLabel-shrink)': { transform: 'translate(14px, 7px) scale(1)' },
            '&.MuiInputLabel-shrink': { fontSize: uiTokens.type.body },
          },
          '@media (pointer: coarse)': {
            '& .MuiInputBase-root': { minHeight: uiTokens.control.height.standard },
            '& .MuiInputBase-input, & .MuiInputLabel-root': { fontSize: uiTokens.type.body },
            '& .MuiInputLabel-root:not(.MuiInputLabel-shrink)': {
              transform: 'translate(14px, 11px) scale(1)',
            },
          },
        }
      : {}),
  }
}

export function FormTextField({
  density = 'standard',
  layout = 'standard',
  textAlign = 'start',
  sx,
  validationHint,
  onValidationHintClose,
  ...props
}: FormTextFieldProps) {
  const generatedId = useId()
  const fieldId = props.id ?? generatedId
  const hintId = `${fieldId}-validation-hint`
  const [nativeHint, setNativeHint] = useState<string | null>(null)
  const hint = validationHint || nativeHint
  const closeHint = () => {
    setNativeHint(null)
    onValidationHintClose?.()
  }

  return (
    <HelpTooltip
      open={Boolean(hint)}
      title={
        hint ? (
          <span id={hintId} role="alert">
            {hint}
          </span>
        ) : (
          ''
        )
      }
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
        id={fieldId}
        slotProps={{
          ...props.slotProps,
          htmlInput: (ownerState) => {
            const supplied = props.slotProps?.htmlInput
            const input = {
              ...props.inputProps,
              ...(typeof supplied === 'function' ? supplied(ownerState) : supplied),
            }
            const helperSlot = props.slotProps?.formHelperText
            const helper = {
              ...props.FormHelperTextProps,
              ...(typeof helperSlot === 'function' ? helperSlot(ownerState) : helperSlot),
            }
            const describedBy = [
              input?.['aria-describedby'],
              props.helperText ? (helper.id ?? `${fieldId}-helper-text`) : null,
              hint ? hintId : null,
            ]
              .filter(Boolean)
              .join(' ')
            return { ...input, ...(describedBy ? { 'aria-describedby': describedBy } : {}) }
          },
        }}
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
        sx={mergeSx(
          resolveFieldSx(density, textAlign),
          layout === 'standard'
            ? undefined
            : {
                '& .MuiInputLabel-root': { lineHeight: 1.2 },
                '& .MuiInputBase-root': { minHeight: 44 },
                '& .MuiInputBase-input': {
                  px: layout === 'matrixRow' ? 1 : 1.25,
                  ...(layout === 'matrixRow'
                    ? { py: 0, textAlign: 'center', fontWeight: 600 }
                    : {}),
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  overflowWrap: 'anywhere',
                },
              },
          sx,
        )}
      />
    </HelpTooltip>
  )
}
