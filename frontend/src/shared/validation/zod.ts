import { z } from 'zod'

// Configure before any schema is constructed: even Zod's eval capability probe
// triggers a violation under the application's script-src 'self' policy.
z.config({ jitless: true })

export { z }
