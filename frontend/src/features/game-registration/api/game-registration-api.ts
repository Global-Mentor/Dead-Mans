import { httpClient } from '../../../shared/api/client/httpClient.ts'
import type {
  GameRegistrationSnapshot,
  RegistrationTeam,
} from '../../../shared/api/contracts/index.ts'

export const gameRegistrationApi = {
  getSnapshot: () => httpClient.get<GameRegistrationSnapshot>('/game/registration'),
  createTeam: (recruitmentOpen: boolean) =>
    httpClient.post<RegistrationTeam>('/game/registration/teams', { recruitmentOpen }),
  joinTeam: (teamId: string) =>
    httpClient.post<RegistrationTeam>(`/game/registration/teams/${teamId}/join`),
  leaveTeam: () => httpClient.post<void>('/game/registration/teams/leave'),
  acceptInvitation: (invitationId: string) =>
    httpClient.post<RegistrationTeam>(`/game/registration/invitations/${invitationId}/accept`),
  declineInvitation: (invitationId: string) =>
    httpClient.post<void>(`/game/registration/invitations/${invitationId}/decline`),
  listTeams: () => httpClient.get<RegistrationTeam[]>('/game/registration/teams'),
  confirmTeam: (teamId: string) =>
    httpClient.post<RegistrationTeam>(`/game/registration/teams/${teamId}/confirm`),
  rejectTeam: (teamId: string) =>
    httpClient.post<void>(`/game/registration/teams/${teamId}/reject`),
}
