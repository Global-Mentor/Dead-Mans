import type { components } from '../api/contracts/generated'
import { normalizePlayedCardModifierOutcomeStatus } from '../lib/played-card-formatters.ts'

type PlayedCardPreviewRound = components['schemas']['GameHistoryRoundItemDto']
type PlayedCardPreviewModifier = PlayedCardPreviewRound['modifiers'][number]

export function getPlayedCardModifierEffect(
  modifier: PlayedCardPreviewModifier,
  scoreUnit: number,
) {
  const killPoints = modifier.killDelta * scoreUnit
  return {
    bonus: Math.max(0, modifier.scoreDelta) + Math.max(0, killPoints),
    penalty: Math.min(0, modifier.scoreDelta) + Math.min(0, killPoints),
  }
}

export function getPlayedCardModifierPoints(round: PlayedCardPreviewRound | null) {
  let bonus = 0
  let penalty = 0

  if (round?.status === 'completed') {
    for (const modifier of round.modifiers) {
      const effect = getPlayedCardModifierEffect(modifier, round.scoreDetails.scoreUnit)
      bonus += effect.bonus
      penalty += effect.penalty
    }
  }

  return { bonus, penalty }
}

export interface PlayedCardModifierGroup {
  groupKey: string
  modifierId: string
  modifierName: string
  iconEmoji: string | null
  modifierDescription: string
  count: number
  scoreDelta: number
  killDelta: number
  outcomeStatuses: readonly PlayedCardModifierOutcomeSummary[]
  multiplierAppliedValues: readonly number[]
  definitionRevision: number | null
  violationComments: readonly string[]
}

interface PlayedCardModifierOutcomeSummary {
  status: string
  count: number
}

export function groupPlayedCardModifiers(
  modifiers: readonly PlayedCardPreviewModifier[],
): PlayedCardModifierGroup[] {
  const grouped = new Map<string, PlayedCardModifierGroup>()

  for (const modifier of modifiers) {
    const groupKey = `${modifier.modifierId}:revision-${modifier.definitionRevision}`
    const current = grouped.get(groupKey)
    if (!current) {
      grouped.set(groupKey, {
        groupKey,
        modifierId: modifier.modifierId,
        modifierName: modifier.modifierName,
        iconEmoji: modifier.iconEmoji ?? null,
        modifierDescription: modifier.modifierDescription,
        count: 1,
        scoreDelta: modifier.scoreDelta,
        killDelta: modifier.killDelta,
        outcomeStatuses: [
          { status: normalizePlayedCardModifierOutcomeStatus(modifier.outcomeStatus), count: 1 },
        ],
        multiplierAppliedValues:
          modifier.multiplierApplied === null || modifier.multiplierApplied === undefined
            ? []
            : [modifier.multiplierApplied],
        definitionRevision: modifier.definitionRevision ?? null,
        violationComments: modifier.violationComment?.trim()
          ? [modifier.violationComment.trim()]
          : [],
      })
      continue
    }

    grouped.set(groupKey, {
      ...current,
      count: current.count + 1,
      scoreDelta: current.scoreDelta + modifier.scoreDelta,
      killDelta: current.killDelta + modifier.killDelta,
      outcomeStatuses: mergeModifierOutcomeStatuses(
        current.outcomeStatuses,
        normalizePlayedCardModifierOutcomeStatus(modifier.outcomeStatus),
      ),
      multiplierAppliedValues: mergeModifierMultiplierValues(
        current.multiplierAppliedValues,
        modifier.multiplierApplied,
      ),
      violationComments: modifier.violationComment?.trim()
        ? [...current.violationComments, modifier.violationComment.trim()]
        : current.violationComments,
    })
  }

  return Array.from(grouped.values())
}

function mergeModifierOutcomeStatuses(
  statuses: readonly PlayedCardModifierOutcomeSummary[],
  nextStatus: string,
) {
  const nextStatuses = [...statuses]
  const existingIndex = nextStatuses.findIndex((item) => item.status === nextStatus)

  const existing = nextStatuses[existingIndex]
  if (!existing) {
    nextStatuses.push({ status: nextStatus, count: 1 })
    return nextStatuses
  }

  nextStatuses[existingIndex] = {
    ...existing,
    count: existing.count + 1,
  }
  return nextStatuses
}

function mergeModifierMultiplierValues(
  values: readonly number[],
  nextValue: number | null | undefined,
) {
  if (nextValue === null || nextValue === undefined || values.includes(nextValue)) {
    return values
  }

  return [...values, nextValue]
}
