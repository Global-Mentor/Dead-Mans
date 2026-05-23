import { ApiError } from './errors/ApiError.ts'

/**
 * Treats HTTP 404 as an empty/absent resource for read endpoints that use "not found" as normal state.
 */
export async function fetchNotFoundAsNull<T>(request: () => Promise<T>): Promise<T | null> {
  try {
    return await request()
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    throw error
  }
}
