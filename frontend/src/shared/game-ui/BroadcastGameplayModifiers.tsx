import { memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import type { components } from '../api/contracts/generated'
import { ItemCard } from '../ui/index.ts'
import { ModifierIconTile } from './ModifierIconTile.tsx'
import {
  calculateModifierRuntimeClock,
  createServerClockOffset,
  formatRuntimeDuration,
} from './modifier-runtime-clock.ts'

type Modifier = components['schemas']['GameOverlayGameplayDto']['modifiers'][number]

export const BroadcastModifierItem = memo(function BroadcastModifierItem({
  modifier,
  name,
  expired = false,
  compact = false,
  children,
}: {
  modifier: Modifier
  name: string
  expired?: boolean
  compact?: boolean
  children?: ReactNode
}) {
  const timed = modifier.timers.length > 0 && !compact
  return (
    <ItemCard
      component="li"
      density="flush"
      data-expired={expired || undefined}
      data-modifier-id={modifier.modifierId}
      sx={{
        listStyle: 'none',
        minWidth: 0,
        p: timed ? 0.75 : 0.5,
        minHeight: timed ? 56 : 48,
        display: 'flex',
        alignItems: 'center',
        gap: timed ? 0.75 : 0.5,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          minWidth: 0,
          gap: timed ? 0.75 : 0.5,
          opacity: expired ? 0.65 : 1,
          transition: 'opacity 400ms ease',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        <ModifierIconTile emoji={modifier.iconEmoji} size={timed ? 'large' : 'standard'} />
        <Typography
          component="h4"
          variant={timed ? 'body1' : 'body2'}
          fontWeight={700}
          sx={{ flex: 1, minWidth: 0, lineHeight: 1.15, overflowWrap: 'anywhere' }}
        >
          {name}
        </Typography>
      </Box>
      {children}
    </ItemCard>
  )
})

/** Only the timed group subscribes to the clock; the rest of the HUD stays idle. */
export const BroadcastTimedModifiers = memo(function BroadcastTimedModifiers({
  modifiers,
  gameplayStartedAtUtc,
  serverNowUtc,
  receivedAtMonotonicMs,
  stackedName,
  timerLabel,
}: {
  modifiers: Modifier[]
  gameplayStartedAtUtc: string
  serverNowUtc: string
  receivedAtMonotonicMs: number
  stackedName: (name: string, count: number) => string
  timerLabel: (name: string) => string
}) {
  const rows = useMemo(
    () =>
      modifiers.map((modifier) => ({
        modifier,
        // A shared round start makes equal durations identical deadlines.
        timers: Array.from(
          new Map(modifier.timers.map((timer) => [timer.durationSeconds, timer])).values(),
        ),
      })),
    [modifiers],
  )
  const [nowMs, setNowMs] = useState(() => performance.now())
  const serverNowMs =
    Math.max(nowMs, receivedAtMonotonicMs) +
    createServerClockOffset(serverNowUtc, receivedAtMonotonicMs)
  const roundClock = {
    status: 'in_progress',
    gameplayStartedAtUtc,
    reviewedAtUtc: null,
    finishedAtUtc: null,
  } as const
  const clocks = rows.map(({ modifier, timers }) => ({
    modifier,
    timers: timers.map((timer) => ({
      ...timer,
      ...calculateModifierRuntimeClock(roundClock, timer.durationSeconds, serverNowMs),
    })),
  }))
  const running = clocks.some((row) => row.timers.some((timer) => timer.state === 'running'))
  useEffect(() => {
    if (!running) return
    const update = () => setNowMs(performance.now())
    const interval = window.setInterval(update, 1000)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', update)
    }
  }, [running])
  return (
    <Box
      component="ul"
      data-modifier-group="timed"
      sx={{
        m: 0,
        p: 0,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gridAutoRows: '1fr',
        gap: 0.5,
      }}
    >
      {clocks.map(({ modifier, timers }) => (
        <BroadcastModifierItem
          key={modifier.modifierId}
          modifier={modifier}
          name={
            modifier.activationCount > 1
              ? stackedName(modifier.name, modifier.activationCount)
              : modifier.name
          }
          expired={timers.every((timer) => timer.state === 'expired')}
        >
          <Stack component="span" gap={0.5} sx={{ flexShrink: 0, alignItems: 'stretch' }}>
            {timers.map((timer) => (
              <Box component="span" key={timer.id} sx={{ display: 'grid', gap: 0.25 }}>
                <Typography
                  component="span"
                  role="timer"
                  aria-live="off"
                  aria-label={timerLabel(modifier.name)}
                  variant="h2"
                  fontWeight={800}
                  color={timer.state === 'expired' ? 'text.secondary' : 'primary.light'}
                  sx={{
                    lineHeight: 1.1,
                    minWidth: `${formatRuntimeDuration(timer.durationSeconds).length}ch`,
                    textAlign: 'right',
                  }}
                >
                  {formatRuntimeDuration(timer.remainingSeconds ?? 0)}
                </Typography>
                <Box
                  component="span"
                  aria-hidden
                  sx={{ height: 2, bgcolor: 'divider', overflow: 'hidden' }}
                >
                  <Box
                    component="span"
                    sx={{
                      display: 'block',
                      height: '100%',
                      bgcolor: 'primary.main',
                      transformOrigin: 'left',
                    }}
                    style={{
                      transform: `scaleX(${Math.max(0, Math.min(1, (timer.remainingSeconds ?? 0) / Math.max(1, timer.durationSeconds)))})`,
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        </BroadcastModifierItem>
      ))}
    </Box>
  )
})
