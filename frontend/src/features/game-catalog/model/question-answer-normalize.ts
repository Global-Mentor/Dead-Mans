// Match .NET Char.IsWhiteSpace/String.Trim: U+0085 is whitespace, U+FEFF is not.
export function trimQuestionAnswer(value: string): string {
  return value.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, '')
}

export function normalizeQuestionAnswer(value: string): string {
  const yo = String.fromCodePoint(0x0451)
  const ye = String.fromCodePoint(0x0435)
  // .NET uses simple invariant casing, without final-sigma context or the
  // multi-character expansion of U+0130 performed by JavaScript string casing.
  const input = Array.from(trimQuestionAnswer(value), (character) => {
    const lower = character.toLowerCase()
    return Array.from(lower).length === 1 ? lower : character
  })
    .join('')
    .replaceAll(yo, ye)
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
  return /\p{White_Space}/u.test(character)
}

export function getQuestionDisplayAnswers(question: {
  answer: string
  answers?: readonly string[] | null
}): string[] {
  const rawAnswers = question.answers?.length ? question.answers : [question.answer]
  const trimmed = rawAnswers.map(trimQuestionAnswer).filter((answer) => answer.length > 0)
  return trimmed.length > 0 ? trimmed : [question.answer]
}
