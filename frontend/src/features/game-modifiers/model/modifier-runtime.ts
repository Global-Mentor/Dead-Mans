import type { components } from '../../../shared/api/contracts/generated'

type GameRoundDetails = components['schemas']['GameRoundDetailsDto']
type ModifierResult = GameRoundDetails['modifierResults'][number]

interface ModifierRuntimeUnit {
  key: string
  modifierId: string
  modifierName: string
  description: string
  performer: 'activeTeam' | 'mentor'
  requiresHostMonitoring: boolean
  activationCount: number
  durationSeconds: number | null
}

export function buildModifierRuntimeUnits(round: GameRoundDetails): ModifierRuntimeUnit[] {
  const grouped = new Map<string, ModifierRuntimeUnit>()

  for (const result of round.modifierResults) {
    const behavior = result.runtimeBehavior
    const durationSeconds = normalizeDuration(result)
    if (!behavior || (!behavior.requiresHostMonitoring && durationSeconds === null)) {
      continue
    }

    const key =
      behavior.stackingPolicy === 'aggregateParameters'
        ? `${result.modifierId}:${result.resolutionGroupId ?? 'aggregate'}`
        : result.modifierResultId
    const current = grouped.get(key)
    if (current) {
      current.activationCount += 1
      current.durationSeconds = sumOptionalDurations(current.durationSeconds, durationSeconds)
      continue
    }

    grouped.set(key, {
      key,
      modifierId: result.modifierId,
      modifierName: result.modifierName,
      description: result.modifierDescription,
      performer: behavior.performer,
      requiresHostMonitoring: behavior.requiresHostMonitoring,
      activationCount: 1,
      durationSeconds,
    })
  }

  return Array.from(grouped.values())
}

function normalizeDuration(result: ModifierResult) {
  const duration = result.runtimeBehavior?.durationSecondsPerActivation
  return typeof duration === 'number' && Number.isFinite(duration) && duration > 0
    ? Math.floor(duration)
    : null
}

function sumOptionalDurations(left: number | null, right: number | null) {
  if (left === null) return right
  if (right === null) return left
  return left + right
}
