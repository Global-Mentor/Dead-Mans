import { useEffect, useMemo, useState } from 'react'
import type { components } from '../api/contracts/generated'
import { createServerClockOffset } from './modifier-runtime-clock.ts'

type Gameplay = components['schemas']['GameOverlayGameplayDto']
const COLLAPSE_DELAY_MS = 15_000

/** A single deadline wakeup changes layout; countdown ticks stay inside the timed group. */
export function useBroadcastModifierGroups(gameplay: Gameplay, receivedAtMonotonicMs: number) {
  const [nowMs, setNowMs] = useState(() => performance.now())
  const offset = createServerClockOffset(gameplay.serverNowUtc, receivedAtMonotonicMs)
  const groups = useMemo(() => {
    const serverNow = Math.max(nowMs, receivedAtMonotonicMs) + offset
    const started = Date.parse(gameplay.gameplayStartedAtUtc)
    const timed: Gameplay['modifiers'] = []
    const untimed: Gameplay['modifiers'] = []
    const expired: { modifier: Gameplay['modifiers'][number]; deadline: number }[] = []
    let nextDeadline = Infinity
    for (const modifier of gameplay.modifiers) {
      if (!modifier.timers.length) {
        untimed.push(modifier)
        continue
      }
      const deadline =
        started +
        Math.max(...modifier.timers.map((timer) => timer.durationSeconds)) * 1000 +
        COLLAPSE_DELAY_MS
      if (Number.isFinite(deadline) && serverNow >= deadline) {
        expired.push({ modifier, deadline })
      } else {
        timed.push(modifier)
        if (Number.isFinite(deadline)) nextDeadline = Math.min(nextDeadline, deadline)
      }
    }
    expired.sort((a, b) => a.deadline - b.deadline)
    return {
      timed,
      compact: [...untimed, ...expired.map(({ modifier }) => modifier)],
      nextDeadline,
    }
  }, [gameplay.modifiers, gameplay.gameplayStartedAtUtc, nowMs, offset, receivedAtMonotonicMs])

  useEffect(() => {
    if (!Number.isFinite(groups.nextDeadline)) return
    const update = () => setNowMs(performance.now())
    const timeout = window.setTimeout(
      update,
      Math.min(2_147_483_647, Math.max(0, groups.nextDeadline - (performance.now() + offset))),
    )
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearTimeout(timeout)
      document.removeEventListener('visibilitychange', update)
    }
  }, [groups.nextDeadline, offset, nowMs])
  return groups
}
