import { useState } from 'react'
import type { GameQuestionCatalogItem } from '../../shared/api/contracts/index.ts'

export function useCatalogQuestionSelection(
  questions: readonly GameQuestionCatalogItem[],
  viewKey: string,
) {
  const [selection, setSelection] = useState<{
    viewKey: string
    question: GameQuestionCatalogItem
  } | null>(null)
  const explicit = selection?.viewKey === viewKey ? selection.question : null
  return {
    selected:
      questions.find((question) => question.questionId === explicit?.questionId) ??
      explicit ??
      questions[0] ??
      null,
    select: (question: GameQuestionCatalogItem) => setSelection({ viewKey, question }),
    clear: () => setSelection(null),
  }
}
