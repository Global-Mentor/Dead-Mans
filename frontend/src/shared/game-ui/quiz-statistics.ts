import type { components } from '../api/contracts/generated'

type Quiz = components['schemas']['GameHistoryQuizSectionDto']
type Session = Pick<Quiz['questionSessions'][number], 'questionSessionId' | 'image'>

/** Presentation totals from recorded answer statistics and immutable session snapshots. */
export function summarizeQuizFormats(
  quiz: {
    questionSessions: readonly Session[]
    playerStats: readonly Pick<
      Quiz['playerStats'][number],
      'textStatistics' | 'screenshotStatistics'
    >[]
  },
  current: Session | null = null,
) {
  const sessions = new Map<string, Session>(
    quiz.questionSessions.map((session) => [session.questionSessionId, session]),
  )
  if (current && !sessions.has(current.questionSessionId))
    sessions.set(current.questionSessionId, current)
  const summarize = (screenshot: boolean) => {
    const statistics = quiz.playerStats.map((player) =>
      screenshot ? player.screenshotStatistics : player.textStatistics,
    )
    const attempts = statistics.reduce((sum, item) => sum + (item?.attempts ?? 0), 0)
    const correct = statistics.reduce((sum, item) => sum + (item?.correctAnswers ?? 0), 0)
    return {
      asked: [...sessions.values()].filter((session) => Boolean(session.image) === screenshot)
        .length,
      players: statistics.filter((item) => (item?.attempts ?? 0) > 0).length,
      attempts,
      correct,
      incorrect: Math.max(0, attempts - correct),
      accuracy: attempts ? (correct / attempts) * 100 : null,
      earned: statistics.reduce((sum, item) => sum + (item?.points ?? 0), 0),
    }
  }
  return { text: summarize(false), screenshot: summarize(true) }
}
