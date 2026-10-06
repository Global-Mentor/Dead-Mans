import { Alert, type AlertProps } from '@mui/material'
import { feedbackSurfaceSx } from '../../../theme/feedback-surface-sx.ts'
import { mergeSx } from '../../../theme/merge-sx.ts'

/** Errors announce immediately; background information does not interrupt the active task. */
export function InlineNotice({
  severity = 'info',
  appearance = 'standard',
  role,
  sx,
  ...props
}: AlertProps & { appearance?: 'standard' | 'inline' | 'textured' }) {
  return (
    <Alert
      {...props}
      severity={severity}
      role={role ?? (severity === 'error' ? 'alert' : 'status')}
      sx={mergeSx(
        (theme) => ({
          minWidth: 0,
          ...(appearance === 'textured'
            ? { ...feedbackSurfaceSx(theme, severity), px: 1.25, py: 0.75 }
            : {}),
          ...(appearance === 'inline' ? { p: 0, border: 0, background: 'none' } : {}),
          '& .MuiAlert-message': {
            minWidth: 0,
            overflowWrap: 'anywhere',
            ...(appearance === 'textured' ? { py: 0, fontSize: '0.875rem', lineHeight: 1.4 } : {}),
            ...(appearance === 'inline' ? { p: 0, fontSize: '0.78rem', lineHeight: 1.35 } : {}),
          },
        }),
        sx,
      )}
    />
  )
}
