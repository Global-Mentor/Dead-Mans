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
  appearance = 'card',
  density = 'standard',
}: {
  label: string
  value: ReactNode
  emphasis?: 'normal' | 'result' | 'label'
  description?: ReactNode
  help?: string
  action?: ReactNode
  tone?: 'default' | 'success' | 'error'
  appearance?: 'card' | 'summary'
  density?: 'standard' | 'compact'
}) {
  const labelId = useId()
  const summary = appearance === 'summary'
  const compact = summary && density === 'compact'
  const emphasizeLabel = emphasis === 'label'
  const body = (
    <Stack
      spacing={compact ? 0.5 : summary ? 1.5 : 1}
      sx={summary ? { width: '100%', textAlign: 'center', alignItems: 'center' } : undefined}
    >
      <Box
        component="dl"
        sx={{
          m: 0,
          minWidth: 0,
          ...(summary
            ? { width: '100%', minHeight: compact ? 38 : 60, alignContent: 'center' }
            : {}),
        }}
      >
        <Typography
          id={labelId}
          component="dt"
          variant={emphasizeLabel || (summary && !compact) ? 'body1' : 'caption'}
          color={emphasizeLabel ? 'primary.light' : 'text.secondary'}
          fontWeight={emphasizeLabel ? 700 : undefined}
          sx={
            summary && tone !== 'default'
              ? {
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  overflow: 'hidden',
                  clipPath: 'inset(50%)',
                  whiteSpace: 'nowrap',
                }
              : compact
                ? { lineHeight: 1.2 }
                : undefined
          }
        >
          {label}
        </Typography>
        <Typography
          component="dd"
          variant={
            emphasizeLabel
              ? 'caption'
              : compact
                ? 'body1'
                : emphasis === 'result'
                  ? 'h5'
                  : summary
                    ? 'h6'
                    : 'body2'
          }
          sx={{
            m: 0,
            fontWeight: emphasizeLabel ? 400 : 700,
            ...(compact ? { lineHeight: 1.2 } : {}),
            color: emphasizeLabel
              ? 'text.secondary'
              : emphasis === 'result'
                ? 'primary.light'
                : 'text.primary',
          }}
        >
          {tone === 'default' ? (
            value
          ) : (
            <StatusBadge
              color={tone}
              label={value}
              emphasis={summary ? 'prominent' : 'standard'}
              sx={summary ? { width: '100%' } : undefined}
            />
          )}
        </Typography>
      </Box>
      {description ? (
        <Box sx={{ minWidth: 0, ...(summary ? { width: '100%' } : {}) }}>{description}</Box>
      ) : null}
      {action}
    </Stack>
  )
  const groupProps = {
    role: tone === 'default' ? 'group' : 'status',
    'aria-labelledby': labelId,
    tabIndex: help ? 0 : undefined,
  }
  const content = summary ? (
    <Box
      {...groupProps}
      sx={{
        minWidth: 0,
        minHeight: compact ? 38 : 44,
        display: 'flex',
        alignItems: 'center',
        overflowWrap: 'anywhere',
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      {body}
    </Box>
  ) : (
    <SectionCard
      {...groupProps}
      surface="inset"
      sx={{ minWidth: 0, height: '100%', overflowWrap: 'anywhere' }}
    >
      {body}
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
