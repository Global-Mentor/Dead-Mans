# Dead-Mans Architecture Overview

## Текущий продуктовый скоуп

Приложение состоит из двух вертикалей:

- Twitch auth
- game board с чтением снимка, admin-only открытием ячеек и realtime-синхронизацией
- game setup: один общий admin-черновик в БД, Save + optimistic concurrency (`expectedVersion` / `409`), cell image upload/delete, draft reset через hard-delete только для `draft` (исключение из soft-delete политики), realtime через SignalR (контракт в OpenAPI `x-signalr`, см. `docs/architecture/realtime.md`)
- game modifiers (phase 1): глобальный каталог модификаторов, выбор `enabledModifierCodes` в draft setup, активация `admin/moderator` только в `active`-игре, хранение `activeModifiers` в БД и realtime событие `modifierActivated` на `game-board` hub
- game history (phase 1): user-centric API `GET /api/game/history/users/{userId}` возвращает активность пользователя по играм (какие модификаторы активировал и какие вопросы были зачтены как ответы пользователя)
- lifecycle archive (phase 1): `DELETE /api/game/lifecycle/games/{gameId}` выполняет soft-delete для non-draft игр; draft остаётся отдельным hard-delete сценарием через game setup
- game registration: приём заявок в статусе `ready`, команды и инвайты (см. `docs/architecture/game-registration.md`)
- политика удаления и сохранения истории: `docs/architecture/data-retention.md`

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
  gameSetupMediaController --> gameSetupCellMediaService[IGameSetupCellMediaService]
  gameSetupService --> gameSetupRepo[DbGameSetupRepository]
  gameSetupCellMediaService --> gameSetupRepo
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
- `features/game-registration/` - общий HTTP client и data access для регистрации команд (используют `game-application` и `team-registrations`)
- `features/game-application/` - страница заявки игрока
- `features/team-registrations/` - admin-подтверждение команд
- `routes/` - декларативные panel routes, guard/access helpers и route elements для `/panel`
- `shared/ui/` - единые UI primitives (buttons/inputs/cards/dialogs/loading/state)
- `shared/theme/` - единые UI tokens и layout presets
- `shared/api/client/` - HTTP transport
- `shared/api/contracts/` - generated types из OpenAPI
- `shared/auth/` - auth context и guard

## Backend

- `Controllers/` - `AuthController`, `AuthSessionController`, `GameController`, `GameSetupController`, `GameSetupCellMediaController`, `GameLifecycleController`, `GameRegistrationController`
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

Общий workflow: [`docs/development.md`](../development.md). Скрипты bootstrap/reset: `backend/scripts/setup-local.ps1` и `backend/scripts/reset-local.ps1`. В Windows в корне — `setup-local.bat` / `reset-local.bat` как обёртки над теми же `.ps1`.

## Контракты

Source of truth:

- `backend/openapi/deadmans.v1.yaml`

Frontend regeneration:

```bash
npm --prefix frontend run generate:transport
```
