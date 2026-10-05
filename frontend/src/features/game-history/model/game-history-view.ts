import type { TFunction } from 'i18next'
import type { components } from '../../../shared/api/contracts/generated'

type GameHistoryGameSummary = components['schemas']['GameHistoryGameSummaryDto']
type GameHistoryRound = components['schemas']['GameHistoryRoundItemDto']

export function formatGameTimeLabel(
  game: Pick<GameHistoryGameSummary, 'startedAtUtc' | 'finishedAtUtc' | 'createdAtUtc'>,
  t: TFunction,
  locale?: string,
) {
  if (game.finishedAtUtc) {
    return t('gameHistory.gameTimeFinished', {
      date: formatDateTime(game.finishedAtUtc, locale),
    })
  }

  if (game.startedAtUtc) {
    return t('gameHistory.gameTimeStarted', {
      date: formatDateTime(game.startedAtUtc, locale),
    })
  }

  return t('gameHistory.gameTimeCreated', {
    date: formatDateTime(game.createdAtUtc, locale),
  })
}

export function formatDateTime(value: string, locale?: string) {
  return new Date(value).toLocaleString(locale)
}

export function normalizeStatus(status: string) {
  return status.toLowerCase()
}

function normalizeRoundStatus(status: string) {
  return status.toLowerCase().replace(/\s+/g, '_')
}

export function isCountedRound(round: GameHistoryRound) {
  return normalizeRoundStatus(round.status) === 'completed'
}
