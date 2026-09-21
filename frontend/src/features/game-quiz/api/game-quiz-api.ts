import {
  createApiClient,
  unwrapOpenApiData,
  unwrapOpenApiDataOrNullOnNoContent,
} from '../../../shared/api/client/openApiClient.ts'
import type {
  AvailableGameQuizQuestion,
  CurrentGameQuizState,
  GameQuizSubmissionReceipt,
  PrepareTwitchQuizQuestionResult,
  TwitchQuizIntegrationStatus,
  TwitchQuizPublicationState,
} from '../../../shared/api/contracts/index.ts'
import type { paths } from '../../../shared/api/contracts/generated'

type QuizPaths = Pick<
  paths,
  | '/game/quiz/current'
  | '/game/quiz/questions/available'
  | '/game/quiz/questions/ask-next'
  | '/game/quiz/questions/{questionId}/ask'
  | '/game/quiz/question-sessions/{questionSessionId}/submissions'
  | '/integrations/twitch/status'
  | '/integrations/twitch/quiz/questions/prepare'
  | '/integrations/twitch/quiz/publications/{publicationId}/retry'
  | '/integrations/twitch/quiz/publications/{publicationId}/cancel'
  | '/integrations/twitch/quiz/publications/{publicationId}/skip-outcome'
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

export function askNextGameQuizQuestion() {
  return unwrapOpenApiData(client.POST('/game/quiz/questions/ask-next'))
}

export function askSpecificGameQuizQuestion(questionId: string) {
  return unwrapOpenApiData(
    client.POST('/game/quiz/questions/{questionId}/ask', {
      params: { path: { questionId } },
    }),
  )
}

export function fetchTwitchQuizIntegrationStatus(): Promise<TwitchQuizIntegrationStatus> {
  return unwrapOpenApiData(client.GET('/integrations/twitch/status'))
}

export function prepareTwitchQuizQuestion(
  questionId?: string,
): Promise<PrepareTwitchQuizQuestionResult> {
  return unwrapOpenApiData(
    client.POST('/integrations/twitch/quiz/questions/prepare', {
      body: { questionId: questionId ?? null },
    }),
  )
}

export function retryTwitchQuizPublication(
  publicationId: string,
): Promise<TwitchQuizPublicationState> {
  return unwrapOpenApiData(
    client.POST('/integrations/twitch/quiz/publications/{publicationId}/retry', {
      params: { path: { publicationId } },
    }),
  )
}

export function cancelTwitchQuizPublication(
  publicationId: string,
): Promise<TwitchQuizPublicationState> {
  return unwrapOpenApiData(
    client.POST('/integrations/twitch/quiz/publications/{publicationId}/cancel', {
      params: { path: { publicationId } },
    }),
  )
}

export function skipTwitchQuizOutcome(publicationId: string): Promise<TwitchQuizPublicationState> {
  return unwrapOpenApiData(
    client.POST('/integrations/twitch/quiz/publications/{publicationId}/skip-outcome', {
      params: { path: { publicationId } },
    }),
  )
}
