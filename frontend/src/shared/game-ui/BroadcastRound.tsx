import { memo, useRef } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import type { components } from '../api/contracts/generated'
import { ImageFrame, ItemCard, StatusBadge } from '../ui/index.ts'
import { ModifierDetailsItem, ModifierDetailsList } from './ModifierDetails.tsx'
import { RoundBriefingPanel, RoundBriefingDivider } from './RoundBriefingPanel.tsx'
import { groupModifierActivations } from './modifier-activation-groups.ts'
import { useBroadcastContentFit } from './use-broadcast-content-fit.ts'
import { broadcastRevealSx, broadcastUpdateSx } from './broadcast-motion.ts'

export const BroadcastRound = memo(function BroadcastRound({
  round,
  labels,
}: {
  round: components['schemas']['GameOverlayRoundDto']
  labels: {
    card: string
    cost: string
    modifiers: string
    phase: string
    phaseLabel: string
    total: string
    loading: string
    imageError: string
    stackedName: (name: string, count: number) => string
  }
}) {
  const { container, content, scale } = useBroadcastContentFit('top')
  const imageFrame = useRef<HTMLDivElement>(null)
  const groups = Array.from(groupModifierActivations(round.modifiers).values())

  const columnSx = {
    minWidth: 0,
    display: 'grid',
    gridRow: '2 / 4',
    gridTemplateRows: 'subgrid',
    gap: 1.5,
    alignItems: 'start',
  }
  return (
    <Box ref={container} sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <Box
        ref={content}
        data-testid="overlay-round-layout"
        sx={{
          width: '100%',
          minHeight: 'var(--overlay-content-height)',
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
          aria-label={labels.modifiers}
          data-testid="overlay-modifiers"
          sx={{ ...columnSx, gridColumn: 1 }}
        >
          <ItemCard frame="corner" data-testid="overlay-modifiers-header" sx={{ height: '100%' }}>
            <Stack
              spacing={1}
              alignItems="center"
              justifyContent="center"
              sx={{ height: '100%', textAlign: 'center', overflowWrap: 'anywhere' }}
            >
              <Typography component="h2" variant="h6">
                {labels.modifiers}
              </Typography>
              <RoundBriefingDivider />
              <Typography variant="body1">{labels.total}</Typography>
            </Stack>
          </ItemCard>
          {round.modifiers.length > 0 ? (
            <ModifierDetailsList
              count={groups.length}
              layout="fit"
              scrollContainerRef={container}
              heightReferenceRef={imageFrame}
            >
              {groups.map((activations) => {
                const modifier = activations.at(-1) ?? activations[0]
                return (
                  <ModifierDetailsItem
                    key={modifier.modifierId}
                    title={modifier.name}
                    emoji={modifier.iconEmoji}
                    reserveIcon
                    catalog
                    reveal
                    effect={
                      activations.length > 1 ? (
                        <Box key={activations.length} sx={broadcastUpdateSx}>
                          <StatusBadge
                            component="span"
                            density="tight"
                            variant="outlined"
                            label={`×${activations.length}`}
                            aria-label={labels.stackedName(modifier.name, activations.length)}
                          />
                        </Box>
                      ) : null
                    }
                  />
                )
              })}
            </ModifierDetailsList>
          ) : null}
        </RoundBriefingPanel>
        <RoundBriefingPanel data-testid="overlay-card" sx={{ ...columnSx, gridColumn: 2 }}>
          <ItemCard frame="corner" data-testid="overlay-card-description" sx={{ height: '100%' }}>
            <Stack
              spacing={1}
              alignItems="center"
              justifyContent="center"
              sx={{ height: '100%', textAlign: 'center', overflowWrap: 'anywhere' }}
            >
              <Typography component="h2" variant="h6">
                {round.columnLabel}: {round.rowLabel}
              </Typography>
              <RoundBriefingDivider />
              <Typography variant="body1">{labels.cost}</Typography>
            </Stack>
          </ItemCard>
          {round.imageUrl ? (
            <Box
              ref={imageFrame}
              data-testid="overlay-card-image"
              sx={{ ...broadcastRevealSx, animationDelay: '160ms' }}
            >
              <ItemCard frame="corner">
                <ImageFrame
                  src={round.imageUrl}
                  alt={round.title || labels.card}
                  loading="eager"
                  loadingLabel={labels.loading}
                  errorLabel={labels.imageError}
                  fit="contain"
                  sx={{ maxHeight: 'var(--overlay-card-height)' }}
                />
              </ItemCard>
            </Box>
          ) : null}
        </RoundBriefingPanel>
      </Box>
    </Box>
  )
})
