const GAME_SETUP_CELL_MEDIA_MAX_BYTES = 5 * 1024 * 1024

export const GAME_SETUP_CELL_MEDIA_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export type GameSetupCellMediaValidationError = 'invalidType' | 'tooLarge'

const allowedMimeTypes = new Set<string>(GAME_SETUP_CELL_MEDIA_ALLOWED_MIME_TYPES)

export function dataTransferHasImageFiles(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes('Files')
}

export function extractGameSetupCellMediaFileFromDataTransfer(
  dataTransfer: DataTransfer,
): File | null {
  for (const file of Array.from(dataTransfer.files)) {
    if (allowedMimeTypes.has(file.type)) {
      return file
    }
  }

  return null
}

export function validateGameSetupCellMediaFile(
  file: File,
): GameSetupCellMediaValidationError | null {
  if (!allowedMimeTypes.has(file.type)) {
    return 'invalidType'
  }

  if (file.size <= 0 || file.size > GAME_SETUP_CELL_MEDIA_MAX_BYTES) {
    return 'tooLarge'
  }

  return null
}
