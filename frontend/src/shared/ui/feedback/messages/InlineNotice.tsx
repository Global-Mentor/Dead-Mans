import { Alert, type AlertProps } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { feedbackSurfaceSx } from '../../../theme/feedback-surface-sx.ts'
import { mergeSx } from '../../../theme/merge-sx.ts'

/** Errors announce immediately; background information does not interrupt the active task. */
export function InlineNotice({
  severity = 'info',
  appearance = 'standard',
  role,
  sx,
  ...props
}: AlertProps & { appearance?: 'standard' | 'inline' | 'textured' | 'emphasized' }) {
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
          ...(appearance === 'emphasized'
            ? {
                border: `2px solid ${theme.palette[severity].light}`,
                backgroundColor: alpha(theme.palette[severity].light, 0.12),
                color: theme.palette.text.primary,
              }
            : {}),
          '& .MuiAlert-message': {
            minWidth: 0,
            overflowWrap: 'anywhere',
            ...(appearance === 'textured' ? { py: 0, ...theme.typography.body2 } : {}),
            ...(appearance === 'inline' ? { p: 0, ...theme.typography.body2 } : {}),
          },
        }),
        sx,
      )}
    />
  )
}
