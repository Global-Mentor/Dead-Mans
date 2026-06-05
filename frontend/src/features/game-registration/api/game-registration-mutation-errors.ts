import { API_ERROR_CODES } from '../../../shared/api/errors/api-error-codes.ts'
import { ApiError } from '../../../shared/api/errors/ApiError.ts'
import type { ErrorResponse } from '../../../shared/api/contracts/index.ts'

const REGISTRATION_ERROR_I18N_KEYS: Record<string, string> = {
  [API_ERROR_CODES.gameRegistrationNotOpen]: 'gameRegistration.errors.notOpen',
  [API_ERROR_CODES.gameRegistrationNoSlots]: 'gameRegistration.errors.noSlots',
  [API_ERROR_CODES.gameRegistrationAlreadyOnTeam]: 'gameRegistration.errors.alreadyOnTeam',
  [API_ERROR_CODES.gameRegistrationTeamNotFound]: 'gameRegistration.errors.teamNotFound',
  [API_ERROR_CODES.gameRegistrationTeamNotJoinable]: 'gameRegistration.errors.teamNotJoinable',
  [API_ERROR_CODES.gameRegistrationNotTeamMember]: 'gameRegistration.errors.notTeamMember',
  [API_ERROR_CODES.gameRegistrationInvitationInvalid]: 'gameRegistration.errors.invitationInvalid',
  [API_ERROR_CODES.gameRegistrationSlotNotFound]: 'gameRegistration.errors.slotNotFound',
  [API_ERROR_CODES.gameRegistrationSlotNotAvailable]: 'gameRegistration.errors.slotNotAvailable',
  [API_ERROR_CODES.gameRegistrationUserNotFound]: 'gameRegistration.errors.userNotFound',
  [API_ERROR_CODES.gameRegistrationPendingInvitation]: 'gameRegistration.errors.pendingInvitation',
  [API_ERROR_CODES.gameRegistrationOperationFailed]: 'gameRegistration.errors.operationFailed',
}

function readApiErrorPayload(error: unknown): ErrorResponse | undefined {
  if (!(error instanceof ApiError) || !error.details || typeof error.details !== 'object') {
    return undefined
  }

  const body = error.details as Partial<ErrorResponse>
  return typeof body.error === 'string' ? (body as ErrorResponse) : undefined
}

export function getGameRegistrationMutationErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  const payload = readApiErrorPayload(error)
  if (payload?.code) {
    const key = REGISTRATION_ERROR_I18N_KEYS[payload.code]
    if (key) {
      return t(key)
    }
  }

  if (error instanceof ApiError) {
    if (error.status === 401) {
      return t('gameRegistration.errors.unauthorized')
    }

    if (error.status === 403) {
      return t('gameRegistration.errors.forbidden')
    }
  }

  return t('gameRegistration.errors.generic')
}
