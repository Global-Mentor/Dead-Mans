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
  appearance?: 'card' | 'summary' | 'row'
  density?: 'standard' | 'compact'
}) {
  const labelId = useId()
  const row = appearance === 'row'
  const summary = appearance !== 'card'
  const compact = summary && density === 'compact'
  const emphasizeLabel = emphasis === 'label'
  const body = (
    <Stack
      spacing={compact ? 0.5 : summary ? 1.5 : 1}
      sx={
        summary
          ? {
              width: '100%',
              textAlign: row ? 'left' : 'center',
              alignItems: row ? 'stretch' : 'center',
            }
          : undefined
      }
    >
      <Box
        component="dl"
        sx={{
          m: 0,
          minWidth: 0,
          ...(summary
            ? { width: '100%', minHeight: row ? 0 : compact ? 38 : 60, alignContent: 'center' }
            : {}),
          ...(row
            ? { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5 }
            : {}),
        }}
      >
        <Typography
          id={labelId}
          component="dt"
          variant={row ? 'body2' : emphasizeLabel || (summary && !compact) ? 'body1' : 'caption'}
          color={emphasizeLabel ? 'primary.light' : 'text.secondary'}
          fontWeight={emphasizeLabel ? 700 : undefined}
          sx={
            summary && !row && tone !== 'default'
              ? {
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  overflow: 'hidden',
                  clipPath: 'inset(50%)',
                  whiteSpace: 'nowrap',
                }
              : {
                  ...(compact ? { lineHeight: 1.2 } : {}),
                  ...(row ? { flex: 1, minWidth: 0 } : {}),
                }
          }
        >
          {label}
        </Typography>
        <Typography
          component="dd"
          variant={
            row
              ? 'body2'
              : emphasizeLabel
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
            ...(row
              ? {
                  textAlign: 'right',
                  maxWidth: '48%',
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }
              : {}),
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
        minHeight: row ? 44 : compact ? 38 : 44,
        display: 'flex',
        alignItems: 'center',
        ...(row ? { borderBottom: '1px solid', borderColor: 'divider', py: 0.5 } : {}),
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
