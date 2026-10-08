import type { AuthRole } from '../api/contracts/index.ts'

type PanelCapability =
  | 'createAdditionalTeams'
  | 'gameSetup'
  | 'openGameBoardCell'
  | 'manageGame'
  | 'manageGameRounds'
  | 'startGame'
  | 'finishGame'

const panelCapabilityRoles: Record<PanelCapability, readonly AuthRole[]> = {
  createAdditionalTeams: ['admin', 'superadmin'],
  gameSetup: ['admin', 'superadmin'],
  openGameBoardCell: ['admin', 'superadmin'],
  manageGame: ['admin', 'superadmin', 'moderator'],
  manageGameRounds: ['admin', 'superadmin', 'moderator'],
  startGame: ['admin', 'superadmin'],
  finishGame: ['admin', 'superadmin'],
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
