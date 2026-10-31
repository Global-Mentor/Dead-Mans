import { memo } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import type { components } from '../api/contracts/generated'
import { ItemCard } from '../ui/index.ts'
import { BroadcastBriefing } from './BroadcastBriefing.tsx'
import { RoundScoreBreakdown } from './RoundScoreBreakdown.tsx'
import { broadcastRevealSx, broadcastUpdateSx } from './broadcast-motion.ts'

export const BroadcastSummary = memo(function BroadcastSummary({
  summary,
  labels,
}: {
  summary: components['schemas']['GameOverlaySummaryDto']
  labels: {
    heading: string
    phaseLabel: string
    breakdown: string
    outcome: string
    total: string
    card: string
    cost: string
    loading: string
    imageError: string
  }
}) {
  return (
    <BroadcastBriefing
      card={summary.card}
      labels={{ ...labels, phase: labels.heading }}
      testId="overlay-summary"
      detailsLabel={labels.breakdown}
      detailsTestId="overlay-results"
      detailsHeader={
        <ItemCard frame="corner" sx={{ display: 'grid', alignItems: 'center' }}>
          <Typography
            component="h2"
            variant="h6"
            fontWeight={700}
            sx={{ textAlign: 'center', overflowWrap: 'anywhere' }}
          >
            {labels.breakdown}
          </Typography>
        </ItemCard>
      }
    >
      {() => (
        <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <RoundScoreBreakdown
            score={summary.scoreDetails}
            provisional={!summary.isFinal}
            showHeading={false}
            showTotal={false}
            presentation="compact"
            animateChanges
          />
          <ItemCard frame="corner" data-testid="overlay-summary-total" sx={{ mt: 'auto' }}>
            <Stack spacing={1.5}>
              <Typography
                component="h3"
                variant="h6"
                sx={{ textAlign: 'center', overflowWrap: 'anywhere' }}
              >
                {labels.total}
              </Typography>
              <Typography
                key={summary.isFinal ? 'final' : summary.scoreDetails.finalScore}
                variant="h2"
                fontWeight={800}
                color={
                  summary.scoreDetails.finalScore < 0
                    ? 'error.main'
                    : summary.scoreDetails.finalScore > 0
                      ? 'success.main'
                      : 'text.primary'
                }
                role="status"
                aria-live="polite"
                sx={{
                  textAlign: 'center',
                  overflowWrap: 'anywhere',
                  ...(summary.isFinal
                    ? { ...broadcastRevealSx, animationDuration: '650ms' }
                    : broadcastUpdateSx),
                }}
              >
                {summary.isFinal ? labels.outcome : summary.scoreDetails.finalScore}
              </Typography>
            </Stack>
          </ItemCard>
        </Box>
      )}
    </BroadcastBriefing>
  )
})
