import type { TFunction } from 'i18next'

export const modifierCategoryCodes = ['preparation', 'round', 'result', 'host'] as const

export type ModifierCategoryCode = (typeof modifierCategoryCodes)[number]

export function getModifierCategory(
  phase: string | undefined,
  performer?: string,
): ModifierCategoryCode | null {
  if (performer === 'mentor') return 'host'
  return modifierCategoryCodes.find((category) => category === phase) ?? null
}

const categoryLabelKeys = {
  preparation: 'common.modifiers.categories.preparation',
  round: 'common.modifiers.categories.round',
  result: 'common.modifiers.categories.result',
  host: 'common.modifiers.categories.host',
} as const

export function getCategoryLabel(t: TFunction, category: ModifierCategoryCode | null): string {
  if (category === null) return ''
  return t(categoryLabelKeys[category])
}
