# Realtime (SignalR)

Canonical contract: `backend/openapi/deadmans.v1.yaml` → `x-signalr` and payload schemas under `components/schemas`.

## Hubs

| Hub | Path | Auth | Server → client events |
|-----|------|------|------------------------|
| game-board | `/hubs/game-board` | Cookie session, any authenticated panel user | `cellOpened` → `GameCellOpenedEventDto` |
| game-setup | `/hubs/game-setup` | Cookie session, admin only | `draftChanged` → no body; refetch `GET /api/game/setup` |

Clients connect to `{backendOrigin}/hubs/*` with credentials (same Twitch cookie session as HTTP).

## Publish failures

After a successful DB write, SignalR publish is **best-effort** (`RealtimePublishGuard` in Application): failures are logged but do not fail the HTTP response. PostgreSQL and `GET /api/game` / `GET /api/game/setup` remain the source of truth; clients can refetch if an event is missed.

## Code alignment

- Backend: `backend/Api/Contracts/RealtimeHubContracts.cs` (paths + event names; must match OpenAPI).
- Frontend: `npm --prefix frontend run generate:realtime` → `frontend/src/shared/realtime/generated.ts`.
- HTTP payload types: `GameCellOpenedEventDto` in generated OpenAPI types (`npm run generate:transport`).

After changing hubs or events, update OpenAPI first, then regenerate frontend artifacts and adjust `RealtimeHubContracts.cs`.
