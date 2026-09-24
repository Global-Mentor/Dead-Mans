import { Alert, type AlertProps } from '@mui/material'
import { mergeSx } from '../../../theme/merge-sx.ts'

/** Errors announce immediately; background information does not interrupt the active task. */
export function InlineNotice({
  severity = 'info',
  appearance = 'standard',
  role,
  sx,
  ...props
}: AlertProps & { appearance?: 'standard' | 'inline' }) {
  return (
    <Alert
      {...props}
      severity={severity}
      role={role ?? (severity === 'error' ? 'alert' : 'status')}
      sx={mergeSx(
        {
          minWidth: 0,
          ...(appearance === 'inline' ? { p: 0, border: 0, background: 'none' } : {}),
          '& .MuiAlert-message': {
            minWidth: 0,
            overflowWrap: 'anywhere',
            ...(appearance === 'inline' ? { p: 0, fontSize: '0.78rem', lineHeight: 1.35 } : {}),
          },
        },
        sx,
      )}
    />
  )
}
