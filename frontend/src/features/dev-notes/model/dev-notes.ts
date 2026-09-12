import { supportedLanguages } from '../../../locales/index.ts'
import { z } from '../../../shared/validation/zod.ts'
import rawDevNotes from '../dev-notes.json'

const DEV_NOTE_STATUSES = ['fix', 'feature', 'change', 'notice'] as const
export type DevNoteStatus = (typeof DEV_NOTE_STATUSES)[number]

const localizedTextSchema = z.union([
  z.string().trim().min(1),
  z
    .object({
      en: z.string().trim().min(1).optional(),
      ru: z.string().trim().min(1).optional(),
      uk: z.string().trim().min(1).optional(),
      pl: z.string().trim().min(1).optional(),
    })
    .refine((value) => Boolean(value.en || value.ru || value.uk || value.pl)),
])

const devNoteSchema = z.object({
  id: z.string().trim().min(1),
  publishedAt: z.iso.datetime(),
  status: z.enum(DEV_NOTE_STATUSES),
  title: localizedTextSchema,
  body: localizedTextSchema,
})

const devNotesFileSchema = z.object({
  notes: z.array(devNoteSchema),
})

type DevNote = z.infer<typeof devNoteSchema>
type DevNoteLocalizedText = z.infer<typeof localizedTextSchema>

function sortDevNotes(notes: readonly DevNote[]): DevNote[] {
  return [...notes].sort((left, right) => {
    const byDate = Date.parse(right.publishedAt) - Date.parse(left.publishedAt)
    if (byDate !== 0) {
      return byDate
    }

    return right.id.localeCompare(left.id)
  })
}

export function parseDevNotes(input: unknown): DevNote[] {
  return sortDevNotes(devNotesFileSchema.parse(input).notes)
}

export function loadDevNotes(): DevNote[] {
  return parseDevNotes(rawDevNotes)
}

export function resolveDevNoteText(value: DevNoteLocalizedText, language: string): string {
  if (typeof value === 'string') {
    return value
  }

  const normalized = supportedLanguages.find(
    (supportedLanguage) =>
      language === supportedLanguage || language.startsWith(`${supportedLanguage}-`),
  )

  return (
    (normalized ? value[normalized] : undefined) ||
    value.ru ||
    value.en ||
    supportedLanguages.map((code) => value[code]).find((text) => Boolean(text)) ||
    ''
  )
}
