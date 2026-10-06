import { Box, Typography } from '@mui/material'
import { useId } from 'react'
import { HelpTooltip } from '../../feedback/help/HelpTooltip.tsx'

/** A plain-text live state with an accessible label and no action styling. */
export function StatusReadout({
  label,
  value,
  tone = 'default',
  help,
  density = 'standard',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'error'
  help?: string
  density?: 'standard' | 'compact'
}) {
  const labelId = useId()
  const accent = tone === 'default' ? 'text.secondary' : `${tone}.light`
  const content = (
    <Box
      role="status"
      aria-labelledby={labelId}
      aria-atomic="true"
      tabIndex={help ? 0 : undefined}
      sx={{
        width: '100%',
        minWidth: 0,
        minHeight: density === 'compact' ? 32 : 60,
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        overflowWrap: 'anywhere',
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <Box component="dl" sx={{ m: 0, width: '100%', minWidth: 0 }}>
        <Typography
          id={labelId}
          component="dt"
          variant="caption"
          color="text.secondary"
          sx={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            clipPath: 'inset(50%)',
          }}
        >
          {label}
        </Typography>
        <Typography
          component="dd"
          variant={density === 'compact' ? 'body1' : 'h6'}
          sx={{
            m: 0,
            fontWeight: 700,
            color: accent,
            lineHeight: density === 'compact' ? 1.2 : 1.25,
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  )

  return help ? (
    <HelpTooltip title={help} arrow describeChild>
      {content}
    </HelpTooltip>
  ) : (
    content
  )
}
