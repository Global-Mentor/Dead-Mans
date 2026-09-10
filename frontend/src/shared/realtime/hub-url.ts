import { getBackendOrigin } from '../api/config.ts'
import { realtimeHubs, type RealtimeHubKey } from './generated.ts'

export function buildRealtimeHubUrl(hub: RealtimeHubKey): string {
  return `${getBackendOrigin()}${realtimeHubs[hub].path}`
}
