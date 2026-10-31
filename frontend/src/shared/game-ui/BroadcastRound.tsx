import { memo } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import type { components } from '../api/contracts/generated'
import { ItemCard, StatusBadge } from '../ui/index.ts'
import { ModifierDetailsItem, ModifierDetailsList } from './ModifierDetails.tsx'
import { RoundBriefingDivider } from './RoundBriefingPanel.tsx'
import { groupModifierActivations } from './modifier-activation-groups.ts'
import { BroadcastBriefing } from './BroadcastBriefing.tsx'
import { broadcastUpdateSx } from './broadcast-motion.ts'

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
  const groups = Array.from(groupModifierActivations(round.modifiers).values())

  return (
    <BroadcastBriefing
      card={round}
      labels={labels}
      testId="overlay-round-layout"
      detailsLabel={labels.modifiers}
      detailsTestId="overlay-modifiers"
      detailsHeader={
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
      }
    >
      {({ container, imageFrame }) =>
        round.modifiers.length > 0 ? (
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
        ) : null
      }
    </BroadcastBriefing>
  )
})
