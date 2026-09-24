import type { GameRoundSummaryFormInput as Draft } from './game-round-summary-form.ts'

/** Rebase user input on the latest server metadata without relying on array positions. */
export function reconcileGameRoundDraft(previous: Draft, draft: Draft, next: Draft): Draft {
  return {
    ...next,
    ...editedFields(previous, draft, ['killsCount', 'bountyCount', 'notes', 'postRoundAction']),
    ruleGroups: reconcileRows(
      previous.ruleGroups,
      draft.ruleGroups,
      next.ruleGroups,
      (row) => row.resolutionGroupId,
      ['outcomeStatus', 'violationComment'],
    ),
    scoringInstances: reconcileRows(
      previous.scoringInstances,
      draft.scoringInstances,
      next.scoringInstances,
      // Aggregated rows can acquire a different representative after a reorder.
      // Changed membership or resolution kind is a different input contract.
      (row) =>
        JSON.stringify([row.modifierId, row.resolutionKind, [...row.memberResultIds].sort()]),
      ['isConditionMet', 'countValue'],
    ),
  }
}

/** Compare only editable input, treating an unchanged numeric field's DOM string as its number. */
export function hasGameRoundDraftChanges(previous: Draft, draft: Draft): boolean {
  return (
    JSON.stringify(reconcileGameRoundDraft(previous, draft, previous)) !== JSON.stringify(previous)
  )
}

function editedFields<T extends object>(
  previous: T,
  draft: T,
  fields: readonly (keyof T)[],
): Partial<T> {
  const edits: Partial<T> = {}
  for (const field of fields) {
    const before = previous[field]
    const after = draft[field]
    const unchangedNumber =
      typeof before === 'number' &&
      typeof after === 'string' &&
      after.trim() !== '' &&
      Number(after) === before
    if (!Object.is(before, after) && !unchangedNumber) edits[field] = after
  }
  return edits
}

function reconcileRows<T extends object>(
  previous: T[],
  draft: T[],
  next: T[],
  identity: (row: T) => string,
  fields: readonly (keyof T)[],
): T[] {
  const previousById = new Map(previous.map((row) => [identity(row), row]))
  const draftById = new Map(draft.map((row) => [identity(row), row]))
  return next.map((row) => {
    const before = previousById.get(identity(row))
    const edited = draftById.get(identity(row))
    return before && edited ? { ...row, ...editedFields(before, edited, fields) } : row
  })
}
