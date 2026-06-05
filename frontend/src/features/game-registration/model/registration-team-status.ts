import type { TFunction } from 'i18next'

const TEAM_STATUS_KEYS = {
  forming: 'gameRegistration.teamStatus.forming',
  confirmed: 'gameRegistration.teamStatus.confirmed',
  disbanded: 'gameRegistration.teamStatus.disbanded',
} as const

export function formatRegistrationTeamStatus(status: string, t: TFunction): string {
  const key = TEAM_STATUS_KEYS[status as keyof typeof TEAM_STATUS_KEYS]
  return key ? t(key) : status
}
