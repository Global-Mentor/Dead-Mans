import {
  createApiClient,
  unwrapOpenApiData,
  unwrapOpenApiDataOrNullOnNoContent,
} from '../../../shared/api/client/openApiClient.ts'
import type {
  AvailableGameQuizQuestion,
  AskedQuizQuestion,
  CurrentGameQuizState,
  GameQuizSubmissionReceipt,
} from '../../../shared/api/contracts/index.ts'
import type { paths } from '../../../shared/api/contracts/generated'

type QuizPaths = Pick<
  paths,
  | '/game/quiz/current'
  | '/game/quiz/questions/available'
  | '/game/quiz/questions/ask-next'
  | '/game/quiz/questions/{questionId}/ask'
  | '/game/quiz/question-sessions/{questionSessionId}/submissions'
>

const client = createApiClient<QuizPaths>()

export function fetchAvailableGameQuizQuestions(): Promise<AvailableGameQuizQuestion[]> {
  return unwrapOpenApiData(client.GET('/game/quiz/questions/available'))
}

export function fetchCurrentGameQuizState(): Promise<CurrentGameQuizState | null> {
  return unwrapOpenApiDataOrNullOnNoContent(client.GET('/game/quiz/current'))
}

export function submitGameQuizAnswer(
  questionSessionId: string,
  optionId: string,
): Promise<GameQuizSubmissionReceipt> {
  return unwrapOpenApiData(
    client.POST('/game/quiz/question-sessions/{questionSessionId}/submissions', {
      params: { path: { questionSessionId } },
      body: { optionId },
    }),
  )
}

export function askNextGameQuizQuestion(): Promise<AskedQuizQuestion> {
  return unwrapOpenApiData(client.POST('/game/quiz/questions/ask-next'))
}

export function askSpecificGameQuizQuestion(questionId: string): Promise<AskedQuizQuestion> {
  return unwrapOpenApiData(
    client.POST('/game/quiz/questions/{questionId}/ask', {
      params: { path: { questionId } },
    }),
  )
}
