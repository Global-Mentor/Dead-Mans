export function isExpectedSignalrNegotiationShutdown(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('stopped during negotiation') || message.includes('connection was stopped')
  )
}
