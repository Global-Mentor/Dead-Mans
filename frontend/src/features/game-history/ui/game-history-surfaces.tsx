import { AccordionDetails, Box, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ReactNode } from 'react'
import type { components } from '../../../shared/api/contracts/generated'
import { AppAccordion, AppAccordionSummary } from '../../../shared/ui/index.ts'
import { PlayedCardPreviewDialog } from '../../../shared/game-ui/index.ts'
import { MiniMetricChip } from './game-history-display.tsx'

type GameHistoryRound = components['schemas']['GameHistoryRoundItemDto']

export function CardPreviewDialog({
  round,
  onClose,
}: {
  round: GameHistoryRound | null
  onClose: () => void
}) {
  return <PlayedCardPreviewDialog card={null} round={round} onClose={onClose} />
}

export function AccordionSurface({
  children,
  defaultExpanded = false,
  highlighted = false,
}: {
  children: NonNullable<ReactNode>
  defaultExpanded?: boolean
  highlighted?: boolean
}) {
  return (
    <AppAccordion
      defaultExpanded={defaultExpanded}
      tone={highlighted ? 'warning' : 'default'}
      sx={(theme) => ({
        borderColor: alpha(theme.palette.primary.main, 0.2),
        '&:nth-of-type(even)': { backgroundColor: alpha(theme.palette.primary.main, 0.055) },
      })}
    >
      {children}
    </AppAccordion>
  )
}

export function CollapsibleSection({
  title,
  description,
  countLabel,
  children,
  defaultExpanded = false,
  nested = false,
}: {
  title: string
  description: string
  countLabel?: string
  children: ReactNode
  defaultExpanded?: boolean
  nested?: boolean
}) {
  return (
    <AppAccordion
      defaultExpanded={defaultExpanded}
      surface={nested ? 'inset' : 'plain'}
      sx={{
        '& .MuiAccordionSummary-root:not(.Mui-expanded) .history-section-description': {
          display: 'none',
        },
      }}
    >
      <AppAccordionSummary expandIcon={<ExpandGlyph />}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {title}
              </Typography>
              <Typography
                className="history-section-description"
                variant="body2"
                color="text.secondary"
              >
                {description}
              </Typography>
            </Box>
            {countLabel ? <MiniMetricChip label={countLabel} /> : null}
          </Stack>
        </Box>
      </AppAccordionSummary>

      <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>{children}</AccordionDetails>
    </AppAccordion>
  )
}

export function ExpandGlyph() {
  return (
    <Typography variant="body2" fontWeight={800} color="text.secondary">
      ▾
    </Typography>
  )
}

export function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={(theme) => ({
        borderRadius: 999,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
        backgroundColor: alpha(theme.palette.background.paper, 0.54),
        minWidth: 0,
        px: 1,
        py: 0.7,
      })}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          display: '-webkit-box',
          overflow: 'hidden',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}
