import type { AuthRole } from '../api/contracts/index.ts'

const descendingRoles = ['superadmin', 'admin', 'moderator', 'viewer'] as const
export function highestRole(roles: readonly AuthRole[]): AuthRole {
  return descendingRoles.find((role) => roles.includes(role)) ?? 'viewer'
}
