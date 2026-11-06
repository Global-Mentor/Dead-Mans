import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { components, paths } from '../../../shared/api/contracts/generated'
import { createApiClient, unwrapOpenApiData } from '../../../shared/api/client/openApiClient.ts'

export type ProfileGame = components['schemas']['UserProfileGameDto']
export type ProfileAnswer = components['schemas']['UserProfileAnswerDto']
export type ProfileGamesPage = components['schemas']['UserProfileGamesPageDto']
export type ProfileAnswersPage = components['schemas']['UserProfileAnswersPageDto']
export type ProfileParticipation = NonNullable<
  NonNullable<paths['/profile/me/games']['get']['parameters']['query']>['participation']
>
const profilePageSize = 20
const client =
  createApiClient<Pick<paths, '/profile/me' | '/profile/me/games' | '/profile/me/answers'>>()

export const userProfileQueryKeys = {
  summary: (userId: string) => ['userProfile', userId, 'summary'] as const,
  games: (userId: string, participation: ProfileParticipation, page: number) =>
    ['userProfile', userId, 'games', participation, page] as const,
  answers: (userId: string, gameId: string | null, page: number) =>
    ['userProfile', userId, 'answers', gameId, page] as const,
}

export const userProfileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: userProfileQueryKeys.summary(userId),
    queryFn: ({ signal }) => unwrapOpenApiData(client.GET('/profile/me', { signal })),
    refetchOnWindowFocus: true,
  })

export const profileGamesQueryOptions = (
  userId: string,
  participation: ProfileParticipation,
  page: number,
) =>
  queryOptions({
    queryKey: userProfileQueryKeys.games(userId, participation, page),
    queryFn: ({ signal }) =>
      unwrapOpenApiData(
        client.GET('/profile/me/games', {
          signal,
          params: { query: { participation, page, pageSize: profilePageSize } },
        }),
      ),
    placeholderData: (previous, query) =>
      query?.queryKey[1] === userId && query.queryKey[3] === participation
        ? keepPreviousData(previous)
        : undefined,
    refetchOnWindowFocus: true,
  })

export const profileAnswersQueryOptions = (userId: string, gameId: string | null, page: number) =>
  queryOptions({
    queryKey: userProfileQueryKeys.answers(userId, gameId, page),
    queryFn: ({ signal }) =>
      unwrapOpenApiData(
        client.GET('/profile/me/answers', {
          signal,
          params: { query: { page, pageSize: profilePageSize, ...(gameId ? { gameId } : {}) } },
        }),
      ),
    placeholderData: (previous, query) =>
      query?.queryKey[1] === userId && query.queryKey[3] === gameId
        ? keepPreviousData(previous)
        : undefined,
    refetchOnWindowFocus: true,
  })
