import { z } from 'zod'
import { GAME_SETUP_MAX_TITLE_LENGTH } from './game-setup-limits.ts'

interface CreateGameSetupFormSchemaMessages {
  required: string
  invalidTitle: string
}

export function createGameSetupFormSchema(messages: CreateGameSetupFormSchemaMessages) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, messages.required)
      .max(GAME_SETUP_MAX_TITLE_LENGTH, messages.invalidTitle),
  })
}

export type CreateGameSetupFormValues = z.infer<ReturnType<typeof createGameSetupFormSchema>>
