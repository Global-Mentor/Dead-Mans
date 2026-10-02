import type {
  GameModifierActivation,
  GameModifierAvailability,
} from '../../../shared/api/contracts/index.ts'
import type { components } from '../../../shared/api/contracts/generated'
import { modifierCategoryCodes, type ModifierCategoryCode } from './modifier-categories.ts'

interface GroupedActiveModifier {
  modifierId: string
  modifierName: string
  activationCost: number
  activationsCount: number
  lastActivatedAtUtc: string
  lastActivatedByDisplayName: string
  activators: readonly GroupedModifierActivator[]
  activations: readonly GameModifierActivation[]
}

interface GroupedModifierActivator {
  userId: string
  displayName: string
  activationsCount: number
  lastActivatedAtUtc: string
}

interface GroupedAvailableModifierCategory {
  category: GameModifierAvailability['modifier']['category']
  items: readonly GameModifierAvailability[]
}

export function groupActiveGameModifiers(
  activations: readonly GameModifierActivation[],
  locale?: string,
): GroupedActiveModifier[] {
  const groups = new Map<string, GameModifierActivation[]>()

  for (const activation of activations) {
    const currentGroup = groups.get(activation.modifierId)
    if (currentGroup) {
      currentGroup.push(activation)
      continue
    }

    groups.set(activation.modifierId, [activation])
  }

  return Array.from(groups.entries())
    .map(([modifierId, groupActivations]) => {
      const sortedActivations = [...groupActivations].sort((left, right) =>
        right.activatedAtUtc.localeCompare(left.activatedAtUtc),
      )
      const latestActivation = sortedActivations[0]

      if (!latestActivation) {
        throw new Error(`Modifier activation group "${modifierId}" is empty`)
      }

      return {
        modifierId,
        modifierName: latestActivation.modifierName,
        activationCost: latestActivation.activationCost,
        activationsCount: sortedActivations.length,
        lastActivatedAtUtc: latestActivation.activatedAtUtc,
        lastActivatedByDisplayName: latestActivation.activatedByDisplayName,
        activators: groupModifierActivators(sortedActivations),
        activations: sortedActivations,
      }
    })
    .sort((left, right) => compareActiveModifierGroup(left, right, locale))
}

export function groupAvailableGameModifiers(
  items: readonly GameModifierAvailability[],
  locale?: string,
): GroupedAvailableModifierCategory[] {
  const groups = new Map<
    GameModifierAvailability['modifier']['category'],
    GameModifierAvailability[]
  >()

  for (const item of items) {
    const currentGroup = groups.get(item.modifier.category)
    if (currentGroup) {
      currentGroup.push(item)
      continue
    }

    groups.set(item.modifier.category, [item])
  }

  return Array.from(groups.entries())
    .map(([category, categoryItems]) => ({
      category,
      items: [...categoryItems].sort((left, right) => compareAvailability(left, right, locale)),
    }))
    .sort(compareAvailabilityCategory)
}

export function groupActiveModifierCategories(
  groups: readonly GroupedActiveModifier[],
  available: readonly GameModifierAvailability[],
  results: readonly Pick<
    components['schemas']['GameRoundModifierResultDto'],
    'modifierId' | 'modifierCategory'
  >[],
): { category: ModifierCategoryCode | null; items: GroupedActiveModifier[] }[] {
  const categories = new Map<ModifierCategoryCode | null, GroupedActiveModifier[]>()
  for (const group of groups) {
    const saved = results.find((result) => result.modifierId === group.modifierId)?.modifierCategory
    const category =
      modifierCategoryCodes.find((code) => code === saved) ??
      available.find((item) => item.modifier.id === group.modifierId)?.modifier.category ??
      null
    const items = categories.get(category) ?? []
    items.push(group)
    categories.set(category, items)
  }
  return [...modifierCategoryCodes, null].flatMap((category) => {
    const items = categories.get(category)
    return items ? [{ category, items }] : []
  })
}

function compareAvailability(
  left: GameModifierAvailability,
  right: GameModifierAvailability,
  locale?: string,
): number {
  if (left.modifier.activationCost !== right.modifier.activationCost) {
    return left.modifier.activationCost - right.modifier.activationCost
  }

  return (
    left.modifier.name.localeCompare(right.modifier.name, locale) ||
    left.modifier.id.localeCompare(right.modifier.id)
  )
}

function compareActiveModifierGroup(
  left: GroupedActiveModifier,
  right: GroupedActiveModifier,
  locale?: string,
): number {
  if (left.activationCost !== right.activationCost) {
    return left.activationCost - right.activationCost
  }

  return (
    left.modifierName.localeCompare(right.modifierName, locale) ||
    left.modifierId.localeCompare(right.modifierId)
  )
}

function compareAvailabilityCategory(
  left: GroupedAvailableModifierCategory,
  right: GroupedAvailableModifierCategory,
): number {
  return (
    modifierCategoryCodes.indexOf(left.category) - modifierCategoryCodes.indexOf(right.category)
  )
}

function groupModifierActivators(
  activations: readonly GameModifierActivation[],
): GroupedModifierActivator[] {
  const activators = new Map<string, GroupedModifierActivator>()

  for (const activation of activations) {
    const currentActivator = activators.get(activation.activatedByUserId)
    if (currentActivator) {
      currentActivator.activationsCount += 1
      if (activation.activatedAtUtc.localeCompare(currentActivator.lastActivatedAtUtc) > 0) {
        currentActivator.lastActivatedAtUtc = activation.activatedAtUtc
      }

      continue
    }

    activators.set(activation.activatedByUserId, {
      userId: activation.activatedByUserId,
      displayName: activation.activatedByDisplayName,
      activationsCount: 1,
      lastActivatedAtUtc: activation.activatedAtUtc,
    })
  }

  return Array.from(activators.values()).sort((left, right) =>
    right.lastActivatedAtUtc.localeCompare(left.lastActivatedAtUtc),
  )
}
