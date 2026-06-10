import { ApiError } from './errors/ApiError.ts'

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
