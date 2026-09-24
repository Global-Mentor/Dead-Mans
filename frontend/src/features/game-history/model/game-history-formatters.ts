import type { TFunction } from 'i18next'
import { formatTeamNameWithFallback } from '../../game-registration/model/team-name.ts'

type GameHistoryCardLabelInput = {
  cellTitle?: string | null
  cellCost: number
}

export function formatCardLabel(round: GameHistoryCardLabelInput, t: TFunction) {
  return round.cellTitle || t('gameHistory.cardDialogFallbackTitle')
}

export function formatShortCardLabel(round: GameHistoryCardLabelInput, t: TFunction) {
  const title = round.cellTitle || t('gameHistory.cardDialogFallbackTitle')
  return `${title} · ${t('gameHistory.cardCostLabel', { cost: round.cellCost })}`
}

export function formatHistoryTeamName(
  t: TFunction,
  teamName: string | null | undefined,
  teamSlotIndex: number,
) {
  return formatTeamNameWithFallback(teamName, t('common.teamWithSlot', { slot: teamSlotIndex }))
}
