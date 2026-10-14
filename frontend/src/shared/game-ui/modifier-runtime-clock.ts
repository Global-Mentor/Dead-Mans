import type { components } from '../api/contracts/generated'

type GameRoundDetails = components['schemas']['GameRoundDetailsDto']

type ModifierRuntimeState = 'scheduled' | 'running' | 'expired' | 'stopped'

interface ModifierRuntimeClock {
  state: ModifierRuntimeState
  remainingSeconds: number | null
}

export function calculateModifierRuntimeClock(
  round: Pick<
    GameRoundDetails,
    'status' | 'gameplayStartedAtUtc' | 'reviewedAtUtc' | 'finishedAtUtc'
  >,
  durationSeconds: number | null,
  serverNowMs: number,
): ModifierRuntimeClock {
  if (durationSeconds === null) {
    return { state: round.status === 'in_progress' ? 'running' : 'stopped', remainingSeconds: null }
  }
  if (!round.gameplayStartedAtUtc) {
    return { state: 'scheduled', remainingSeconds: durationSeconds }
  }

  const startedAtMs = Date.parse(round.gameplayStartedAtUtc)
  if (!Number.isFinite(startedAtMs)) {
    return { state: 'scheduled', remainingSeconds: durationSeconds }
  }
  const effectiveNowMs = getEffectiveRuntimeNow(round, serverNowMs)
  const elapsedSeconds = Math.max(0, Math.floor((effectiveNowMs - startedAtMs) / 1_000))
  const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds)

  if (remainingSeconds === 0) {
    return { state: 'expired', remainingSeconds: 0 }
  }
  return {
    state: round.status === 'in_progress' ? 'running' : 'stopped',
    remainingSeconds,
  }
}

export function createServerClockOffset(serverNowUtc: string, clientReceivedAtMs: number) {
  const serverNowMs = Date.parse(serverNowUtc)
  return Number.isFinite(serverNowMs) ? serverNowMs - clientReceivedAtMs : 0
}

export function formatRuntimeDuration(remainingSeconds: number) {
  const clamped = Math.max(0, Math.floor(remainingSeconds))
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function getEffectiveRuntimeNow(
  round: Pick<GameRoundDetails, 'status' | 'reviewedAtUtc' | 'finishedAtUtc'>,
  serverNowMs: number,
) {
  if (
    (round.status === 'reviewing_results' || round.status === 'showing_results') &&
    round.reviewedAtUtc
  ) {
    return Date.parse(round.reviewedAtUtc)
  }
  if ((round.status === 'completed' || round.status === 'cancelled') && round.finishedAtUtc) {
    return Date.parse(round.finishedAtUtc)
  }
  return serverNowMs
}
