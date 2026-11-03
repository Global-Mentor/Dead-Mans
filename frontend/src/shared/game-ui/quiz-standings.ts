export type QuizStanding = {
  textStatistics?: { attempts: number; correctAnswers: number; points: number } | null
  screenshotStatistics?: { attempts: number; correctAnswers: number; points: number } | null
  displayName: string
  points: number
  availablePoints?: number
  attempts: number
  correctAnswers: number
  userId?: string
}

export function sortQuizStandings<T extends QuizStanding>(entries: readonly T[]): T[] {
  return [...entries].sort(
    (left, right) =>
      right.points - left.points ||
      right.correctAnswers - left.correctAnswers ||
      right.attempts - left.attempts ||
      left.displayName.localeCompare(right.displayName),
  )
}
