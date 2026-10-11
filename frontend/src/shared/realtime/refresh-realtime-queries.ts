import { hashKey, type QueryClient, type QueryKey } from '@tanstack/react-query'

interface RefreshJob {
  dirty: boolean
  promise: Promise<void>
}

const clients = new WeakMap<QueryClient, Map<string, RefreshJob>>()

// Merge synchronous subscribers and keep one trailing refresh for events received
// during HTTP. Unlike a timer throttle, this never postpones the first request.
export function refreshRealtimeQueries(client: QueryClient, queryKey: QueryKey): Promise<void> {
  let jobs = clients.get(client)
  if (!jobs) {
    jobs = new Map()
    clients.set(client, jobs)
  }
  const key = hashKey(queryKey)
  const existing = jobs.get(key)
  if (existing) {
    existing.dirty = true
    return existing.promise
  }
  const job: RefreshJob = {
    dirty: true,
    promise: Promise.resolve().then(async () => {
      try {
        do {
          job.dirty = false
          await client.invalidateQueries({ queryKey })
        } while (job.dirty)
      } finally {
        jobs.delete(key)
      }
    }),
  }
  jobs.set(key, job)
  return job.promise
}
