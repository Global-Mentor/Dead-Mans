# Dead-Mans Architecture Overview

## Текущий продуктовый скоуп

Приложение состоит из двух вертикалей:

- Twitch auth
- game board с чтением снимка, admin-only открытием ячеек и realtime-синхронизацией

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
  auth --> authControllers[AuthController / AuthSessionController]
  authControllers --> authServices[Twitch auth + EF auth services]
  authServices --> postgres
```

## Frontend

- `features/auth/` - Twitch login, callback, session restore
- `features/game-board/` - экран игрового поля, open-cell flow и realtime sync
- `shared/api/client/` - HTTP transport
- `shared/api/contracts/` - generated types из OpenAPI
- `shared/auth/` - auth context и guard

## Backend

- `Controllers/` - `AuthController`, `AuthSessionController`, `GameController`
- `Api/Contracts/` + `Api/Mapping/` - transport DTO и явный mapping из application-моделей
- `Application/Features/Auth/` - auth session service
- `Application/Features/GameBoard/` - game-board service
- `Infrastructure/Persistence/DbGameBoardRepository.cs` - чтение игрового поля из БД
- `Infrastructure/Auth/` - Twitch auth, роли, claims transformation
- `Infrastructure/Realtime/` - SignalR hub и publisher игровых событий
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
