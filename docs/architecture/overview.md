# Dead-Mans Architecture Overview

## Текущий продуктовый скоуп

Приложение состоит из двух вертикалей:

- Twitch auth
- game board с чтением снимка, admin-only открытием ячеек и realtime-синхронизацией
- game setup: один общий admin-черновик в БД, Save + optimistic concurrency (`expectedVersion` / `409`), cell image upload/delete, draft reset с очисткой DB и object storage, realtime через SignalR (контракт в OpenAPI `x-signalr`, см. `docs/architecture/realtime.md`)

## Поток данных

```mermaid
flowchart LR
  browser[Browser] --> frontend[Frontend SPA]
  frontend --> api["GET /api/game"]
  frontend --> openCell["POST /api/game/cells/{cellId}/open"]
  frontend --> realtime["/hubs/game-board"]
  frontend --> auth[/auth/*]
  api --> gameController[GameController]
  openCell --> gameController
  gameController --> gameBoardService[IGameBoardService]
  gameBoardService --> gameBoardRepo[DbGameBoardRepository]
  gameBoardRepo --> postgres[(PostgreSQL)]
  gameBoardRepo --> storage[Public media URLs]
  gameBoardService --> realtimePublisher[IGameBoardEventsPublisher]
  realtimePublisher --> realtimeHub[GameBoardHub]
  realtimeHub --> browser
  frontend --> setupApi["GET/POST/PUT/DELETE /api/game/setup"]
  frontend --> setupMedia["POST/DELETE /api/game/setup/cells/{cellId}/media"]
  frontend --> setupRealtime["/hubs/game-setup"]
  setupApi --> gameSetupController[GameSetupController]
  setupMedia --> gameSetupMediaController[GameSetupCellMediaController]
  gameSetupController --> gameSetupService[IGameSetupService]
  gameSetupMediaController --> gameSetupService
  gameSetupService --> gameSetupRepo[DbGameSetupRepository]
  gameSetupRepo --> postgres
  gameSetupService --> setupPublisher[IGameSetupEventsPublisher]
  setupPublisher --> setupHub[GameSetupHub]
  setupHub --> browser
  auth --> authControllers[AuthController / AuthSessionController]
  authControllers --> authServices[Twitch auth + EF auth services]
  authServices --> postgres
```

## Frontend

- `features/auth/` - Twitch login, callback, session restore
- `features/game-board/` - экран игрового поля, open-cell flow и realtime sync
- `features/game-setup/` - настройка черновика игры, cell media, Save/layout flow, realtime sync
- `shared/api/client/` - HTTP transport
- `shared/api/contracts/` - generated types из OpenAPI
- `shared/auth/` - auth context и guard

## Backend

- `Controllers/` - `AuthController`, `AuthSessionController`, `GameController`, `GameSetupController`, `GameSetupCellMediaController`
- `Api/Contracts/` + `Api/Mapping/` - transport DTO и явный mapping из application-моделей
- `Application/Features/Auth/` - auth session service
- `Application/Features/GameBoard/` - game-board service
- `Application/Features/GameSetup/` - draft setup, cell media, storage cleanup on reset
- `Application/Abstractions/IObjectStorage.cs` + `Infrastructure/Storage/` - S3-compatible object storage port
- `Infrastructure/Persistence/DbGameBoardRepository.cs` - чтение игрового поля из БД
- `Infrastructure/Persistence/DbGameSetupRepository.cs` - draft setup persistence
- `Infrastructure/Auth/` - Twitch auth, роли, claims transformation
- `Infrastructure/Realtime/` - SignalR hubs и publishers (`GameBoardHub`, `GameSetupHub`)
- `Data/` - EF Core context, entities, migrations
- `assets/test-game-board/cards/` - source-controlled тестовые PNG для локального bootstrap
- `tools/SeedTestGameBoardMedia/` - uploader этих PNG в MinIO

## Локальное развертывание

Корневой `README.md`: `backend/scripts/setup-local.ps1` (идемпотентный bootstrap), `reset-local.ps1` (удаление volumes + повторный setup). В Windows в корне — `setup-local.bat` / `reset-local.bat` как обёртки над теми же `.ps1`.

## Контракты

Source of truth:

- `backend/openapi/deadmans.v1.yaml`

Frontend regeneration:

```bash
npm --prefix frontend run generate:contracts
```
