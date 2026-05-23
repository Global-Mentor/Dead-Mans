# Dead-Mans Backend

Backend поддерживает auth, game board, game setup (admin draft), game registration и lifecycle.

## Что есть в коде

- `Controllers/` — auth, game board, game setup, registration, lifecycle.
- `Application/` — use-case services (`GameBoard`, `GameSetup`, `GameRegistration`, `GameLifecycle`) и repository ports.
- `Infrastructure/` — Twitch auth, EF repositories (`DbGame*Repository`), SignalR publishers.
- `Data/` — `ApplicationDbContext`, entities, configurations, migrations.
- `openapi/deadmans.v1.yaml` — канонический контракт (HTTP + SignalR `x-signalr`); см. `docs/architecture/realtime.md`.
- `Api/Contracts/RealtimeHubContracts.cs` — hub paths и event names (синхронно с OpenAPI).

## Актуальные endpoint'ы

- `GET /api/game`, `POST /api/game/cells/{cellId}/open`
- `GET/POST/PUT/DELETE /api/game/setup`, cell media under `/api/game/setup/cells/{cellId}/media`
- `GET /api/game/registration`, team/invitation mutations under `/api/game/registration/*`
- `GET /api/game/registration/teams` (admin), confirm/reject, invitations
- `POST /api/game/lifecycle/open-registration`, `/start`, `/finish` (admin workflow; HTTP в контроллере)
- `GET /auth/me`, `POST /auth/logout`, Twitch login/callback

## Локальный запуск

Bootstrap и сброс: корневой `README.md` (`scripts/setup-local.ps1`, `reset-local.ps1`; на Windows — `setup-local.bat`, `reset-local.bat` в корне репо).

Сервер из каталога `backend/`:

```powershell
dotnet run --project backend.csproj
```

Из корня репозитория: `npm run dev:backend`.

## База данных и storage

Игровое поле читается из PostgreSQL через EF Core. Открытие ячеек выполняется на backend с role-check по admin и публикует realtime-события через SignalR. Медиа-URL для ячеек строятся на основе `Storage:PublicBaseUrl`.

Game setup (admin draft):

- `GET/POST/PUT/DELETE /api/game/setup` — черновик и пакетное сохранение текстовых полей.
- `POST/DELETE /api/game/setup/cells/{cellId}/media` — загрузка/удаление изображения ячейки (multipart, admin only).
- Object key: `{Storage:GamesPrefix}/{gameId}/{Storage:CardsGroup}/{col}-{row}.{ext}` (см. `GameMediaObjectKeyFormat`).
- `DELETE /api/game/setup` удаляет черновик в Postgres, затем best-effort удаляет все объекты с префиксом `{GamesPrefix}/{gameId}/` в `Storage:BucketName`.

Обязательные ключи `Storage` для media: `PublicBaseUrl`, `BucketName`, `GamesPrefix`, `CardsGroup`. Для записи в MinIO в dev также `AccessKey` / `SecretKey` (или `MINIO_ROOT_*`).

Каноничный источник тестовых картинок:

- `backend/assets/test-game-board/cards/`

Uploader:

- `tools/SeedTestGameBoardMedia/`
- `scripts/upload-test-game-board-media.ps1`

Migration создает тестовую игру и записи `media_assets` / `board_cell_media`, а uploader заливает в bucket `deadman` реальные PNG-файлы с теми же object key (`games/{gameId}/cards/{col}-{row}.png`).

## Twitch auth

Для работы auth нужны:

- `TwitchAuth__ClientId`
- `TwitchAuth__ClientSecret`
- `TwitchAuth__RedirectUri`
- `TwitchAuth__FrontendRedirectUri`
- `TwitchAuth__Scopes__*`

Backend валидирует auth-конфигурацию и наличие рабочего `ApplicationDbContext` на старте.

## Forwarded headers (proxy)

Если backend работает за reverse proxy/load balancer, настройте секцию `ForwardedHeaders`:

- `ForwardedHeaders__Enabled=true` (глобальное включение/отключение обработки forwarded headers)
- `ForwardedHeaders__TrustedProxies__0=203.0.113.10` (отдельные IP прокси)
- `ForwardedHeaders__TrustedNetworks__0=10.0.0.0/24` (доверенные подсети в CIDR)

Локально в `Development` по умолчанию включен совместимый режим:

- `ForwardedHeaders__TrustAllProxiesInDevelopment=true`

Для stage/prod рекомендуется оставить только trusted proxy/network и не полагаться на "trust all".
Для тестовых/специальных окружений можно временно отключить поведение полностью: `ForwardedHeaders__Enabled=false`.
