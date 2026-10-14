import { memo } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import type { components } from '../api/contracts/generated'
import { ImageFrame, ItemCard } from '../ui/index.ts'
import { RoundBriefingPanel } from './RoundBriefingPanel.tsx'
import { RoundScoreBreakdown } from './RoundScoreBreakdown.tsx'
import { useBroadcastContentFit } from './use-broadcast-content-fit.ts'
import { broadcastRevealSx, broadcastUpdateSx } from './broadcast-motion.ts'

export const BroadcastSummary = memo(function BroadcastSummary({
  summary,
  labels,
}: {
  summary: components['schemas']['GameOverlaySummaryDto']
  labels: {
    heading: string
    outcome: string
    total: string
    card: string
    cost: string
    loading: string
    imageError: string
  }
}) {
  const { container, content, scale } = useBroadcastContentFit('top')
  return (
    <Box ref={container} sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <Box
        ref={content}
        data-testid="overlay-summary"
        sx={{
          width: '100%',
          position: 'absolute',
          left: '50%',
          top: 0,
          transform: `translateX(-50%) scale(${scale ?? 1})`,
          transformOrigin: 'top center',
          visibility: scale === null ? 'hidden' : 'visible',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            minHeight: 'var(--overlay-content-height)',
            gridTemplateRows: 'auto 1fr',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: 3,
            alignItems: 'stretch',
          }}
        >
          <RoundBriefingPanel
            component="section"
            aria-label={labels.card}
            sx={{
              gridColumn: 1,
              gridRow: '1 / span 2',
              display: 'grid',
              gridTemplateRows: 'subgrid',
              gap: 1.5,
              textAlign: 'center',
              overflowWrap: 'anywhere',
            }}
          >
            <ItemCard frame="corner" sx={{ display: 'grid', alignItems: 'center' }}>
              <Stack spacing={1}>
                <Typography component="h3" variant="h6">
                  {summary.card.columnLabel}: {summary.card.rowLabel}
                </Typography>
                <Typography variant="h6">{labels.cost}</Typography>
              </Stack>
            </ItemCard>
            {summary.card.imageUrl ? (
              <ItemCard frame="corner" sx={{ alignSelf: 'start' }}>
                <ImageFrame
                  src={summary.card.imageUrl}
                  alt={summary.card.title || labels.card}
                  loading="eager"
                  loadingLabel={labels.loading}
                  errorLabel={labels.imageError}
                  fit="contain"
                  sx={{ maxHeight: 'var(--overlay-card-height)' }}
                />
              </ItemCard>
            ) : null}
          </RoundBriefingPanel>
          <RoundBriefingPanel
            component="section"
            aria-label={labels.heading}
            sx={{
              gridColumn: 2,
              gridRow: '1 / span 2',
              display: 'grid',
              gridTemplateRows: 'subgrid',
              gap: 1.5,
            }}
          >
            <ItemCard frame="corner" sx={{ display: 'grid', alignItems: 'center' }}>
              <Typography
                key={labels.heading}
                component="h2"
                variant="h5"
                fontWeight={700}
                sx={{ textAlign: 'center', overflowWrap: 'anywhere', ...broadcastUpdateSx }}
              >
                {labels.heading}
              </Typography>
            </ItemCard>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
                  <Typography component="h3" variant="h6" sx={{ textAlign: 'center' }}>
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
          </RoundBriefingPanel>
        </Box>
      </Box>
    </Box>
  )
})
