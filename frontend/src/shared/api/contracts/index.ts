import type { components } from './generated.ts'

export type GameBoardCellId = components['schemas']['GameBoardCellDto']['id']
export type GameBoardCellMedia = components['schemas']['GameBoardCellMediaDto']
export type GameBoardCell = components['schemas']['GameBoardCellDto']
export type GameBoardSnapshot = Omit<
  components['schemas']['GameBoardSnapshotDto'],
  'status'
> & {
  status: 'ready' | 'active' | 'finished'
}
export type GameCellOpenedEvent = components['schemas']['GameCellOpenedEventDto']
export type GameModifierDefinition = components['schemas']['GameModifierDefinitionDto']
export type GameModifierActivation = components['schemas']['GameModifierActivationDto']
export type GameModifierActivatedEvent = components['schemas']['GameModifierActivatedEventDto']
export type GameSetupSnapshot = components['schemas']['GameSetupSnapshotDto']
export type CreateGameSetupRequest = components['schemas']['CreateGameSetupRequestDto']
export type UpdateGameSetupRequest = components['schemas']['UpdateGameSetupRequestDto']
export type ErrorResponse = components['schemas']['ErrorResponse']

export type AuthRole = components['schemas']['AuthRole']
export type AuthSession = components['schemas']['AuthSessionDto']

export type GameLifecycleState = components['schemas']['GameLifecycleStateDto']
export type GameRegistrationSnapshot = components['schemas']['GameRegistrationSnapshotDto']
export type RegistrationPlayer = components['schemas']['RegistrationPlayerDto']
export type RegistrationTeamMember = components['schemas']['RegistrationTeamMemberDto']
export type RegistrationTeam = components['schemas']['RegistrationTeamDto']
export type RegistrationSlot = components['schemas']['RegistrationSlotDto']
export type RegistrationInvitation = components['schemas']['RegistrationInvitationDto']
export type CreateRegistrationTeamRequest =
  components['schemas']['CreateRegistrationTeamRequestDto']
export type CreateAdminInvitationRequest =
  components['schemas']['CreateAdminInvitationRequestDto']
