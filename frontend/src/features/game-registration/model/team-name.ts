export const TEAM_NAME_MIN_LENGTH = 3
export const TEAM_NAME_MAX_LENGTH = 48

function teamNameUniquenessKey(value: string) {
  return value.replace(/\s/g, '').toUpperCase()
}

export function isTeamNameTaken(
  value: string,
  existingNames: readonly (string | null | undefined)[],
) {
  const key = teamNameUniquenessKey(value)
  return key.length > 0 && existingNames.some((name) => teamNameUniquenessKey(name ?? '') === key)
}

export function normalizeTeamNameInput(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length > 0 ? normalized : undefined
}

export function formatTeamNameWithFallback(teamName: string | null | undefined, fallback: string) {
  return normalizeTeamNameInput(teamName ?? '') ?? fallback
}
