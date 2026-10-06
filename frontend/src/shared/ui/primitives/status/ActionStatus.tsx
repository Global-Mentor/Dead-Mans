import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { feedbackSurfaceSx } from '../../../theme/feedback-surface-sx.ts'
import { uiTokens } from '../../../theme/tokens.ts'

/** Non-interactive state occupying the same slot as an action. */
export function ActionStatus({
  label,
  description,
  compact = false,
  tone = 'error',
}: {
  label: string
  description: string
  compact?: boolean
  tone?: 'error' | 'warning' | 'default'
}) {
  return (
    <Box
      component="span"
      role="status"
      aria-label={description}
      sx={(theme) => ({
        width: '100%',
        minHeight: compact ? uiTokens.control.height.compact : uiTokens.control.height.standard,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 1,
        py: 0.5,
        color: tone === 'default' ? 'text.secondary' : `${tone}.light`,
        backgroundColor: alpha(
          tone === 'default' ? theme.palette.text.secondary : theme.palette[tone].dark,
          tone === 'default' ? 0.06 : 0.18,
        ),
        borderInlineStart: '2px solid',
        borderColor: tone === 'default' ? 'divider' : `${tone}.main`,
        overflowWrap: 'anywhere',
        textAlign: 'center',
        cursor: 'default',
        ...(tone === 'error' ? feedbackSurfaceSx(theme, tone) : {}),
      })}
    >
      <Typography
        component="span"
        variant="button"
        sx={{
          fontSize: compact ? '0.875rem' : '1rem',
          textTransform: 'none',
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}
