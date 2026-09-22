import type { components } from '../../shared/api/contracts/generated'

type QuizQuestionSession = components['schemas']['GameHistoryQuizQuestionSessionItemDto']
type ManualAward = components['schemas']['GameHistoryQuizManualAwardItemDto']

type QuizHistoryItem =
  | {
      id: string
      kind: 'questionSession'
      sortAtUtc: string
      questionSession: QuizQuestionSession
    }
  | {
      id: string
      kind: 'manualAward'
      sortAtUtc: string
      award: ManualAward
    }

export function getQuizHistoryItems(
  questionSessions: QuizQuestionSession[],
  manualAwards: ManualAward[],
): QuizHistoryItem[] {
  const items: QuizHistoryItem[] = [
    ...questionSessions.map((questionSession) => ({
      id: `question-session-${questionSession.questionSessionId}`,
      kind: 'questionSession' as const,
      sortAtUtc: questionSession.closedAtUtc ?? questionSession.askedAtUtc,
      questionSession,
    })),
    ...manualAwards.map((award) => ({
      id: `award-${award.awardId}`,
      kind: 'manualAward' as const,
      sortAtUtc: award.awardedAtUtc,
      award,
    })),
  ]

  return items.sort((left, right) => {
    const timeComparison = right.sortAtUtc.localeCompare(left.sortAtUtc)
    if (timeComparison !== 0) return timeComparison
    return right.id.localeCompare(left.id)
  })
}
