import { memo } from 'react'
import { Box, Stack } from '@mui/material'
import type { components } from '../api/contracts/generated'
import { BroadcastModifierItem, BroadcastTimedModifiers } from './BroadcastGameplayModifiers.tsx'
import { useBroadcastContentFit } from './use-broadcast-content-fit.ts'
import { useBroadcastModifierGroups } from './use-broadcast-modifier-groups.ts'
import { useBroadcastModifierMotion } from './use-broadcast-modifier-motion.ts'

export const BroadcastGameplay = memo(function BroadcastGameplay({
  gameplay,
  receivedAtMonotonicMs,
  labels,
}: {
  gameplay: components['schemas']['GameOverlayGameplayDto']
  receivedAtMonotonicMs: number
  labels: {
    modifiers: string
    stackedName: (name: string, count: number) => string
    timer: (name: string) => string
  }
}) {
  const { container, content, scale } = useBroadcastContentFit('top-right')
  const { timed, compact } = useBroadcastModifierGroups(gameplay, receivedAtMonotonicMs)
  useBroadcastModifierMotion(
    content,
    JSON.stringify([
      timed.map((modifier) => modifier.modifierId),
      compact.map((modifier) => modifier.modifierId),
    ]),
    scale,
  )
  return (
    <Box ref={container} sx={{ height: '100%', minHeight: 0, position: 'relative' }}>
      <Stack
        ref={content}
        data-testid="overlay-gameplay"
        component="section"
        aria-label={labels.modifiers}
        gap={1}
        sx={{
          width: '100%',
          position: 'absolute',
          top: 0,
          right: 0,
          transformOrigin: 'top right',
          transform: `scale(${scale ?? 1})`,
          visibility: scale === null ? 'hidden' : 'visible',
        }}
      >
        {timed.length > 0 ? (
          <BroadcastTimedModifiers
            modifiers={timed}
            gameplayStartedAtUtc={gameplay.gameplayStartedAtUtc}
            serverNowUtc={gameplay.serverNowUtc}
            receivedAtMonotonicMs={receivedAtMonotonicMs}
            stackedName={labels.stackedName}
            timerLabel={labels.timer}
          />
        ) : null}
        {compact.length > 0 ? (
          <Box
            component="ul"
            data-modifier-group="untimed"
            sx={{
              m: 0,
              p: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gridAutoRows: '1fr',
              gap: 0.5,
            }}
          >
            {compact.map((modifier) => (
              <BroadcastModifierItem
                key={modifier.modifierId}
                modifier={modifier}
                compact
                expired={modifier.timers.length > 0}
                name={
                  modifier.activationCount > 1
                    ? labels.stackedName(modifier.name, modifier.activationCount)
                    : modifier.name
                }
              />
            ))}
          </Box>
        ) : null}
      </Stack>
    </Box>
  )
})
