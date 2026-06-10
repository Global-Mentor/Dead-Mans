import { TextField } from '@mui/material'
import type { SxProps, TextFieldProps, Theme } from '@mui/material'

type FormFieldLayout = 'default' | 'compact' | 'centered'

export type FormTextFieldProps = TextFieldProps & {
  layout?: FormFieldLayout
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

export function FormTextField({ layout = 'default', sx, ...props }: FormTextFieldProps) {
  const layoutSx = resolveLayoutSx(layout)
  const mergedSx = sx ? ([layoutSx, sx].filter(Boolean) as SxProps<Theme>) : layoutSx
  return (
    <TextField
      size={props.size ?? 'small'}
      fullWidth={props.fullWidth ?? true}
      {...props}
      sx={mergedSx}
    />
  )
}
