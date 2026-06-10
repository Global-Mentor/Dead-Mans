export type GameSetupCellMediaPhase = 'idle' | 'uploading' | 'deleting'

export interface GameSetupCellMediaDisplayState {
  phase: GameSetupCellMediaPhase
  previewUrl: string | null
  cacheRevision: number
}

export function createIdleCellMediaDisplayState(): GameSetupCellMediaDisplayState {
  return {
    phase: 'idle',
    previewUrl: null,
    cacheRevision: 0,
  }
}

function appendGameSetupMediaCacheBust(url: string, revision: number): string {
  if (revision <= 0) {
    return url
  }

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${revision}`
}

export function resolveGameSetupCellImageUrl(
  serverUrl: string | undefined,
  display: GameSetupCellMediaDisplayState | undefined,
): string | undefined {
  if (!display || display.phase === 'idle') {
    return serverUrl
      ? appendGameSetupMediaCacheBust(serverUrl, display?.cacheRevision ?? 0)
      : undefined
  }

  if (display.phase === 'uploading' && display.previewUrl) {
    return display.previewUrl
  }

  if (display.phase === 'deleting') {
    return undefined
  }

  return serverUrl ? appendGameSetupMediaCacheBust(serverUrl, display.cacheRevision) : undefined
}

export function isGameSetupCellMediaBusy(
  display: GameSetupCellMediaDisplayState | undefined,
): boolean {
  return display?.phase === 'uploading' || display?.phase === 'deleting'
}
