# Realtime (SignalR)

Canonical contract: `backend/openapi/deadmans.v1.yaml` → `x-signalr` and payload schemas under `components/schemas`.

## Hubs

| Hub        | Path               | Auth                                         | Server → client events                                                                         |
| ---------- | ------------------ | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| game-board | `/hubs/game-board` | Cookie session, any authenticated panel user | board, round, modifier, quiz, notification and `gameLifecycleChanged` events |
| game-setup | `/hubs/game-setup` | Cookie session, admin only                   | `draftChanged` → no body; refetch `GET /api/game/setup`                                        |

Clients connect to `{backendOrigin}/hubs/*` with credentials (same Twitch cookie session as HTTP).

## Publish failures

After a successful DB write, SignalR publish is **best-effort** (`RealtimePublishGuard` in Application): failures are logged but do not fail the HTTP response. PostgreSQL and `GET /api/game` / `GET /api/game/setup` remain the source of truth; clients can refetch if an event is missed.

`GET /api/game` returns `204 No Content` when no active, ready or finished board is
available. Clients render the normal empty state; a missing board is not an HTTP error.

`gameLifecycleChanged` is emitted only after a successful game-finalization commit and
contains `gameId`, terminal `status`, the incremented `boardVersion` and
`occurredAtUtc`. Consumers invalidate completion-sensitive queries and resync from HTTP;
the event is a freshness hint, not an alternate source of truth.

`modifierCatalogChanged` is emitted after a committed create, meaningful edit, compatibility
cascade, or archive. Its compact list contains every affected stable `modifierId`, the new/current
`revision`, and `isArchived`. Clients invalidate catalog, setup and modifier-history queries;
they never apply the event as an authoritative local mutation.

## Code alignment

- Backend: `backend/Api/Contracts/RealtimeHubContracts.cs` (paths + event names; must match OpenAPI).
- Frontend: `npm --prefix frontend run generate:realtime` → `frontend/src/shared/realtime/generated.ts`.
- HTTP payload types: `GameCellOpenedEventDto` and `GameModifierActivatedEventDto` in generated OpenAPI types (`npm run generate:transport`).
- Shared frontend lifecycle: `frontend/src/shared/realtime/SignalrConnectionProvider.tsx` owns a `SignalrConnectionManager` for the authenticated session. Subscribers share one connection per hub, with credentials, automatic reconnect, bounded retry delays, resync after reconnect and cleanup after the final subscriber leaves.
- Feature realtime modules register only their generated event names, event payload handling and source-of-truth resync logic.

After changing hubs or events, update OpenAPI first, then regenerate frontend artifacts and adjust `RealtimeHubContracts.cs`.
