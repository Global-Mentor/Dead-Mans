import type { TFunction } from 'i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { formatTeamNameWithFallback } from '../../game-registration/model/team-name.ts'

type GameHistoryCardLabelInput = {
  cellTitle?: string | null
  cellCost: number
}

export type GameHistoryBoardLabels = Pick<
  components['schemas']['GameBoardSnapshotDto'],
  'rowLabels' | 'colLabels'
>

export function formatCurrentCardLabel(
  round: Pick<
    components['schemas']['GameHistoryRoundItemDto'],
    'cellTitle' | 'cellRowIndex' | 'cellColIndex'
  >,
  boardLabels: GameHistoryBoardLabels | undefined,
  t: TFunction,
) {
  const title = round.cellTitle?.trim()
  if (title) return title
  const column = boardLabels?.colLabels[round.cellColIndex]?.trim()
  const row = boardLabels?.rowLabels[round.cellRowIndex]?.trim()
  return column && row ? `${column} · ${row}` : t('gameHistory.cardDialogFallbackTitle')
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
