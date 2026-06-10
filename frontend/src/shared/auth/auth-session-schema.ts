import { z } from 'zod'
import type { AuthSession } from '../api/contracts/index.ts'

const authRoleSchema = z.enum(['admin', 'moderator', 'viewer'])

export const authSessionSchema: z.ZodType<AuthSession> = z
  .object({
    userId: z.string().uuid(),
    displayName: z.string(),
    roles: z.array(authRoleSchema),
  })
  .strict()
