export function normalizeQuestionAnswer(value: string): string {
  const yo = String.fromCodePoint(0x0451)
  const ye = String.fromCodePoint(0x0435)
  const input = value.trim().toLocaleLowerCase('en-US').replaceAll(yo, ye)
  if (input.length === 0) {
    return ''
  }

  let pendingWhitespace = false
  let result = ''
  for (const character of input) {
    if (isWhiteSpace(character)) {
      pendingWhitespace = true
      continue
    }

    if (pendingWhitespace && result.length > 0) {
      result += ' '
    }

    result += character
    pendingWhitespace = false
  }

  return result
}

function isWhiteSpace(character: string): boolean {
  return character.trim() === ''
}

export function uniqueTrimmedAnswers(rawAnswers: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const rawAnswer of rawAnswers) {
    const answer = rawAnswer.trim()
    if (answer.length === 0) {
      continue
    }

    const normalizedAnswer = normalizeQuestionAnswer(answer)
    if (!normalizedAnswer || seen.has(normalizedAnswer)) {
      continue
    }

    seen.add(normalizedAnswer)
    result.push(answer)
  }

  return result
}

export function getQuestionDisplayAnswers(question: {
  answer: string
  answers?: readonly string[] | null
}): string[] {
  const rawAnswers = question.answers?.length ? question.answers : [question.answer]
  const trimmed = rawAnswers.map((answer) => answer.trim()).filter((answer) => answer.length > 0)
  return trimmed.length > 0 ? trimmed : [question.answer]
}
