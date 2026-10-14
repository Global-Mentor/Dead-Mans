/** Stable definition identity, independent of display names and individual activation ids. */
export function groupModifierActivations<T extends { modifierId: string }>(
  activations: readonly T[],
) {
  const groups = new Map<string, [T, ...T[]]>()
  for (const activation of activations) {
    const group = groups.get(activation.modifierId)
    if (group) group.push(activation)
    else groups.set(activation.modifierId, [activation])
  }
  return groups
}
