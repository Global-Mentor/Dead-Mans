import { Box, Stack, Typography } from '@mui/material'
import { useId, type ReactNode } from 'react'
import { HelpTooltip } from '../../feedback/help/HelpTooltip.tsx'
import { StatusBadge } from '../status/StatusBadge.tsx'
import { SectionCard } from '../surfaces/SectionCard.tsx'

/** Values are formatted by the caller; metric layout and help are shared. */
export function Metric({
  label,
  value,
  emphasis = 'normal',
  description,
  help,
  action,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  emphasis?: 'normal' | 'result'
  description?: ReactNode
  help?: string
  action?: ReactNode
  tone?: 'default' | 'success' | 'error'
}) {
  const labelId = useId()
  const content = (
    <SectionCard
      surface="inset"
      role={tone === 'default' ? 'group' : 'status'}
      aria-labelledby={labelId}
      tabIndex={help ? 0 : undefined}
      sx={{ minWidth: 0, height: '100%', overflowWrap: 'anywhere' }}
    >
      <Stack spacing={1}>
        <Box component="dl" sx={{ m: 0, minWidth: 0 }}>
          <Typography id={labelId} component="dt" variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography
            component="dd"
            variant={emphasis === 'result' ? 'h5' : 'body2'}
            sx={{
              m: 0,
              fontWeight: 700,
              color: emphasis === 'result' ? 'primary.light' : 'text.primary',
            }}
          >
            {tone === 'default' ? value : <StatusBadge color={tone} label={value} />}
          </Typography>
        </Box>
        {description ? <Box sx={{ minWidth: 0 }}>{description}</Box> : null}
        {action}
      </Stack>
    </SectionCard>
  )
  return help ? (
    <HelpTooltip title={help} arrow describeChild enterTouchDelay={0}>
      {content}
    </HelpTooltip>
  ) : (
    content
  )
}
