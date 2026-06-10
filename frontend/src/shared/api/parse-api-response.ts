import type { ZodType } from 'zod'
import { logger } from '../lib/logger.ts'

export function parseApiResponse<T>(
  schema: ZodType<T>,
  payload: unknown,
  contractName: string,
): T {
  const result = schema.safeParse(payload)

  if (result.success) {
    return result.data
  }

  logger.error('API response contract violation', {
    contractName,
    issues: result.error.issues,
  })
  throw new Error(`API response does not match ${contractName}`)
}
