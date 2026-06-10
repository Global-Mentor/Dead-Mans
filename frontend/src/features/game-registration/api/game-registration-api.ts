import {
  apiClient,
  ensureOpenApiSuccess,
  unwrapOpenApiData,
} from '../../../shared/api/client/openApiClient.ts'
import { fetchNotFoundAsNull } from '../../../shared/api/fetch-not-found-as-null.ts'

export function fetchGameRegistrationSnapshot() {
  return fetchNotFoundAsNull(() => unwrapOpenApiData(apiClient.GET('/game/registration')))
}

export function fetchGameRegistrationAdminTeams() {
  return fetchNotFoundAsNull(() => unwrapOpenApiData(apiClient.GET('/game/registration/teams')))
}

export function createGameRegistrationTeam(recruitmentOpen: boolean) {
  return unwrapOpenApiData(
    apiClient.POST('/game/registration/teams', {
      body: { recruitmentOpen },
    }),
  )
}

export function joinGameRegistrationTeam(teamId: string) {
  return unwrapOpenApiData(
    apiClient.POST('/game/registration/teams/{teamId}/join', {
      params: {
        path: { teamId },
      },
    }),
  )
}

export function leaveGameRegistrationTeam() {
  return ensureOpenApiSuccess(apiClient.POST('/game/registration/teams/leave'))
}

export function acceptGameRegistrationInvitation(invitationId: string) {
  return unwrapOpenApiData(
    apiClient.POST('/game/registration/invitations/{invitationId}/accept', {
      params: {
        path: { invitationId },
      },
    }),
  )
}

export function declineGameRegistrationInvitation(invitationId: string) {
  return ensureOpenApiSuccess(
    apiClient.POST('/game/registration/invitations/{invitationId}/decline', {
      params: {
        path: { invitationId },
      },
    }),
  )
}

export function confirmGameRegistrationTeam(teamId: string) {
  return unwrapOpenApiData(
    apiClient.POST('/game/registration/teams/{teamId}/confirm', {
      params: {
        path: { teamId },
      },
    }),
  )
}

export function rejectGameRegistrationTeam(teamId: string) {
  return ensureOpenApiSuccess(
    apiClient.POST('/game/registration/teams/{teamId}/reject', {
      params: {
        path: { teamId },
      },
    }),
  )
}
