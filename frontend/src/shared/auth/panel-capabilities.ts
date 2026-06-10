import type { AuthRole } from '../api/contracts/index.ts'

export type PanelCapability = 'gameSetup'

const panelCapabilityRoles: Record<PanelCapability, readonly AuthRole[]> = {
  gameSetup: ['admin'],
}

export function hasPanelCapability(
  capability: PanelCapability,
  roles: readonly AuthRole[] | undefined,
) {
  if (!roles || roles.length === 0) {
    return false
  }

  return roles.some((role) => panelCapabilityRoles[capability].includes(role))
}
