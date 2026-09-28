import type { CurrentGameQuizState } from '../../shared/api/contracts/index.ts'
import { CurrentQuizCard } from './CurrentQuizCard.tsx'
import { useSubmitQuizAnswer } from './use-submit-quiz-answer.ts'

export function PlayerQuizCard({
  state,
  disabled,
  onDeadline,
}: {
  state: CurrentGameQuizState
  disabled: boolean
  onDeadline: () => void
}) {
  const submit = useSubmitQuizAnswer(state.gameId)
  return (
    <CurrentQuizCard
      state={state}
      canManage={false}
      questions={[]}
      isSubmitting={submit.isPending}
      isStarting={false}
      embedded
      answerDisabled={disabled}
      error={submit.variables?.questionSessionId === state.questionSessionId ? submit.error : null}
      onSubmit={(questionSessionId, optionId) => submit.mutate({ questionSessionId, optionId })}
      onDeadline={onDeadline}
    />
  )
}
