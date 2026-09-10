import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'yaml'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')
const openApiPath = path.resolve(frontendRoot, '../backend/openapi/deadmans.v1.yaml')
const outputPath = path.resolve(frontendRoot, 'src/shared/realtime/generated.ts')

const document = yaml.parse(fs.readFileSync(openApiPath, 'utf8'))
const signalr = document['x-signalr']

if (!signalr?.hubs) {
  throw new Error('OpenAPI document is missing x-signalr.hubs')
}

const hubs = signalr.hubs

function emitHub(constantName, hubKey) {
  const hub = hubs[hubKey]
  if (!hub?.path) {
    throw new Error(`x-signalr.hubs.${hubKey}.path is required`)
  }

  const serverEvents = hub.serverEvents ?? {}
  const eventEntries = Object.entries(serverEvents).map(([eventKey]) => {
    return `      ${eventKey}: '${eventKey}',`
  })

  return `  ${constantName}: {
    path: '${hub.path}',
    events: {
${eventEntries.join('\n')}
    },
  },`
}

const file = `// Generated from backend/openapi/deadmans.v1.yaml (x-signalr). Do not edit.
// Regenerate: npm --prefix frontend run generate:realtime

export const realtimeHubs = {
${emitHub('gameBoard', 'gameBoard')}
${emitHub('gameSetup', 'gameSetup')}
} as const

export type RealtimeHubKey = keyof typeof realtimeHubs
export type RealtimeServerEventName<H extends RealtimeHubKey> =
  (typeof realtimeHubs)[H]['events'][keyof (typeof realtimeHubs)[H]['events']]
`

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, file)

console.log(`Wrote ${path.relative(frontendRoot, outputPath)}`)
