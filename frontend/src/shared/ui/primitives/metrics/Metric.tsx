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
}: {
  label: string
  value: ReactNode
  emphasis?: 'normal' | 'result'
  description?: ReactNode
  help?: string
  action?: ReactNode
  tone?: 'default' | 'success' | 'error'
  appearance?: 'card' | 'summary'
}) {
  const labelId = useId()
  const summary = appearance === 'summary'
  const body = (
    <Stack
      spacing={summary ? 1.5 : 1}
      sx={summary ? { width: '100%', textAlign: 'center', alignItems: 'center' } : undefined}
    >
      <Box
        component="dl"
        sx={{
          m: 0,
          minWidth: 0,
          ...(summary ? { width: '100%', minHeight: 60, alignContent: 'center' } : {}),
        }}
      >
        <Typography
          id={labelId}
          component="dt"
          variant={summary ? 'body1' : 'caption'}
          color="text.secondary"
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
              : undefined
          }
        >
          {label}
        </Typography>
        <Typography
          component="dd"
          variant={emphasis === 'result' ? 'h5' : summary ? 'h6' : 'body2'}
          sx={{
            m: 0,
            fontWeight: 700,
            color: emphasis === 'result' ? 'primary.light' : 'text.primary',
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
        minHeight: 44,
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
