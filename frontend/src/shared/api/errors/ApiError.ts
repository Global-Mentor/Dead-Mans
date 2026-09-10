export class ApiError extends Error {
  status: number | undefined
  details: unknown

  constructor(message: string, options: { status?: number; details?: unknown } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.details = options.details
  }
}
