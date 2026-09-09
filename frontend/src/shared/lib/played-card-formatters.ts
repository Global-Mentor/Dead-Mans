import type { TFunction } from 'i18next'

export function formatPlayedCardModifierOutcomeStatus(t: TFunction, status: string) {
  const normalized = normalizePlayedCardModifierOutcomeStatus(status)
  const translationKey = `gameHistory.modifierOutcomeStatus.${normalized}`
  return t(translationKey, { defaultValue: t('gameHistory.modifierOutcomeStatus.unknown') })
}

export function getPlayedCardModifierOutcomeColor(
  status: string,
): 'default' | 'success' | 'warning' {
  switch (normalizePlayedCardModifierOutcomeStatus(status)) {
    case 'completed':
    case 'succeeded':
    case 'calculated':
      return 'success'
    case 'failed':
    case 'violated':
      return 'warning'
    default:
      return 'default'
  }
}

export function normalizePlayedCardModifierOutcomeStatus(status: string) {
  const normalized = status.toLowerCase().replace(/\s+/g, '_')
  return normalized === 'canceled' ? 'cancelled' : normalized
}
