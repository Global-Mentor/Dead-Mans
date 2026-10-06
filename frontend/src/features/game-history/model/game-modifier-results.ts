import type { components } from '../../../shared/api/contracts/generated'
import { buildGameHistoryModifierSummary } from './game-history-modifier-summary.ts'

type Round = components['schemas']['GameHistoryRoundItemDto']
type Snapshot = components['schemas']['GameHistoryModifierSnapshotDto']

/** Join only the same historical revision; activation records do not identify revisions. */
export function buildCurrentGameModifierResults(
  rounds: readonly Round[],
  snapshots: readonly Snapshot[],
  includeUnused = false,
) {
  const results = buildGameHistoryModifierSummary(rounds)
  const key = (id: string, revision: number | null) => `${id}:${revision ?? 'unknown'}`
  const grouped = new Map<
    string,
    { result: (typeof results)[number] | null; snapshot: Snapshot | null }
  >(
    results.map((result) => [
      key(result.modifierId, result.definitionRevision),
      { result, snapshot: null },
    ]),
  )
  for (const snapshot of snapshots) {
    const revisionKey = key(snapshot.modifierId, snapshot.revision)
    const existing = grouped.get(revisionKey)
    if (
      !includeUnused &&
      !existing &&
      snapshot.successfulActivationsCount === 0 &&
      snapshot.cancelledActivationsCount === 0 &&
      snapshot.resultsCount === 0 &&
      !snapshot.isEmergencyDisabled
    )
      continue
    if (existing) existing.snapshot = snapshot
    else grouped.set(revisionKey, { result: null, snapshot })
  }
  return Array.from(grouped).flatMap(([revisionKey, { result, snapshot }]) => {
    const definition = snapshot
      ? {
          modifierId: snapshot.modifierId,
          revision: snapshot.revision,
          name: snapshot.name,
          description: snapshot.description,
        }
      : result
        ? {
            modifierId: result.modifierId,
            revision: result.definitionRevision,
            name: result.modifierName,
            description: result.modifierDescription,
          }
        : null
    return definition ? [{ key: revisionKey, ...definition, snapshot, result }] : []
  })
}
