import { getPlayedCardModifierPoints } from '../../../shared/game-ui/played-card-modifiers.ts'
import type { components } from '../../../shared/api/contracts/generated'
import { getRoundScore } from './game-history-team-leaderboard.ts'
import { isCountedRound } from './game-history-view.ts'

type GameDetails = components['schemas']['GameHistoryGameDetailsDto']
type Round = components['schemas']['GameHistoryRoundItemDto']

export function buildGameStatistics(game: GameDetails, activeQuestionId: string | null = null) {
  const rounds = game.mainGame.rounds.filter(isCountedRound)
  const sum = (select: (round: Round) => number) =>
    rounds.reduce((total, round) => total + select(round), 0)
  const record = (select: (round: Round) => number, positiveOnly = false) => {
    if (!rounds.length) return null
    const value = rounds.reduce((best, round) => Math.max(best, select(round)), -Infinity)
    if (positiveOnly && value <= 0) return null
    const round = rounds.find((round) => select(round) === value)
    return round ? { round, value } : null
  }
  const modifierEffects = rounds.map(getPlayedCardModifierPoints)
  const players = game.quiz.playerStats
  const attempts = players.reduce((total, player) => total + player.attempts, 0)
  const correct = players.reduce((total, player) => total + player.correctAnswers, 0)
  return {
    overview: {
      teams: new Set(rounds.map((round) => round.teamId)).size,
      participants: new Set(
        rounds.flatMap((round) => round.participants.map((player) => player.userId)),
      ).size,
      rounds: rounds.length,
      cancelled: game.mainGame.rounds.filter((round) => round.status === 'cancelled').length,
      kills: sum((round) => round.killsCount),
      bounties: sum((round) => round.bountyCount),
    },
    results: {
      positive: rounds.filter((round) => getRoundScore(round) > 0).length,
      negative: rounds.filter((round) => getRoundScore(round) < 0).length,
      points: sum(getRoundScore),
      penalties: sum((round) => round.scoreDetails.penaltyTotal),
    },
    quiz: {
      players: players.length,
      questions: new Set([
        ...game.quiz.questionSessions.map((question) => question.questionSessionId),
        ...(activeQuestionId ? [activeQuestionId] : []),
      ]).size,
      correct,
      incorrect: attempts - correct,
      accuracy: attempts ? (correct / attempts) * 100 : null,
      earned: game.quiz.totalPoints,
    },
    // Modifier results consume this summary independently of the statistics tab.
    modifiers: {
      activations: game.mainGame.modifierActivations.filter(
        (activation) => activation.status !== 'cancelled',
      ).length,
      cancelled: game.mainGame.modifierActivations.filter(
        (activation) => activation.status === 'cancelled',
      ).length,
      rounds: rounds.filter((round) => round.modifiers.length > 0).length,
      unmodifiedRounds: rounds.filter((round) => round.modifiers.length === 0).length,
      bonus: modifierEffects.reduce((total, effect) => total + effect.bonus, 0),
      penalty: modifierEffects.reduce((total, effect) => total + effect.penalty, 0),
    },
    records: {
      score: record(getRoundScore),
      kills: record((round) => round.killsCount, true),
      bounties: record((round) => round.bountyCount, true),
    },
  }
}
