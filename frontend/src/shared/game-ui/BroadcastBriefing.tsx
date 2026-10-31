import { Box, Stack, Typography } from '@mui/material'
import { useRef, type ReactNode, type RefObject } from 'react'
import type { components } from '../api/contracts/generated'
import { ImageFrame, ItemCard } from '../ui/index.ts'
import { RoundBriefingPanel, RoundBriefingDivider } from './RoundBriefingPanel.tsx'
import { useBroadcastContentFit } from './use-broadcast-content-fit.ts'
import { broadcastRevealSx, broadcastUpdateSx } from './broadcast-motion.ts'

type Card = components['schemas']['GameOverlayRoundDto']
type BroadcastBriefingLabels = {
  card: string
  cost: string
  phase: string
  phaseLabel: string
  loading: string
  imageError: string
}

const columnSx = {
  minWidth: 0,
  minHeight: 0,
  display: 'grid',
  gridRow: '2 / 4',
  gridTemplateRows: 'subgrid',
  gap: 1.5,
}

export function BroadcastBriefing({
  card,
  labels,
  testId,
  detailsLabel,
  detailsTestId,
  detailsHeader,
  children,
}: {
  card: Card
  labels: BroadcastBriefingLabels
  testId: string
  detailsLabel: string
  detailsTestId: string
  detailsHeader: ReactNode
  children: (refs: {
    container: RefObject<HTMLDivElement | null>
    imageFrame: RefObject<HTMLDivElement | null>
  }) => ReactNode
}) {
  const { container, content, scale } = useBroadcastContentFit('top')
  const imageFrame = useRef<HTMLDivElement>(null)
  return (
    <Box ref={container} sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <Box
        ref={content}
        data-testid={testId}
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gridTemplateRows: 'auto auto 1fr',
          columnGap: 3,
          rowGap: 1.5,
          position: 'absolute',
          left: '50%',
          top: 0,
          transformOrigin: 'top center',
          transform: `translateX(-50%) scale(${scale ?? 1})`,
          visibility: scale === null ? 'hidden' : 'visible',
        }}
      >
        <RoundBriefingPanel
          component="section"
          aria-label={labels.phaseLabel}
          data-testid="overlay-round-phase"
          sx={{ gridColumn: '1 / -1', gridRow: 1 }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            gap={1}
            flexWrap="wrap"
            sx={{ textAlign: 'center', overflowWrap: 'anywhere' }}
            aria-live="polite"
            aria-atomic="true"
          >
            <Typography component="span" variant="h6">
              {labels.phaseLabel}
            </Typography>
            <Typography key={labels.phase} component="h2" variant="h6" sx={broadcastUpdateSx}>
              {labels.phase}
            </Typography>
          </Stack>
        </RoundBriefingPanel>
        <RoundBriefingPanel
          component="section"
          aria-label={labels.card}
          data-testid="overlay-card"
          sx={{ ...columnSx, gridColumn: 1 }}
        >
          <ItemCard frame="corner" data-testid="overlay-card-description" sx={{ height: '100%' }}>
            <Stack
              spacing={1}
              alignItems="center"
              justifyContent="center"
              sx={{ height: '100%', textAlign: 'center', overflowWrap: 'anywhere' }}
            >
              <Typography component="h3" variant="h6">
                {card.columnLabel}: {card.rowLabel}
              </Typography>
              <RoundBriefingDivider />
              <Typography variant="body1">{labels.cost}</Typography>
            </Stack>
          </ItemCard>
          {card.imageUrl ? (
            <Box
              ref={imageFrame}
              data-testid="overlay-card-image"
              sx={{
                minHeight: 0,
                alignSelf: 'start',
                display: 'grid',
                ...broadcastRevealSx,
                animationDelay: '160ms',
              }}
            >
              <ItemCard frame="corner" sx={{ minHeight: 0, display: 'grid' }}>
                <ImageFrame
                  src={card.imageUrl}
                  alt={card.title || labels.card}
                  loading="eager"
                  loadingLabel={labels.loading}
                  errorLabel={labels.imageError}
                  fit="contain"
                  sizing="full-width"
                />
              </ItemCard>
            </Box>
          ) : null}
        </RoundBriefingPanel>
        <RoundBriefingPanel
          component="section"
          aria-label={detailsLabel}
          data-testid={detailsTestId}
          sx={{ ...columnSx, gridColumn: 2 }}
        >
          {detailsHeader}
          {children({ container, imageFrame })}
        </RoundBriefingPanel>
      </Box>
    </Box>
  )
}
