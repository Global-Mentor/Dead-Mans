# Dead-Mans Frontend

Frontend - активный SPA-пакет проекта Dead-Mans. Он работает вместе с backend как часть единого активного контура.

## Стек

- React 19 + TypeScript
- Vite
- React Router
- TanStack Query
- MUI
- i18next / react-i18next

## Что есть в приложении

- вход через Twitch;
- восстановление сессии через `/auth/me`;
- защищённая панель под `/panel` с role-aware navigation;
- страница `game-board`, которая читает данные из `GET /api/game`, позволяет admin-пользователям открывать ячейки через `POST /api/game/cells/{cellId}/open` и получает realtime-обновления через SignalR;
- страница `game-setup` (admin): общий черновик в БД (`GET/POST/PUT/DELETE /api/game/setup`), медиа ячеек (`POST/DELETE /api/game/setup/cells/{cellId}/media`), Save + layout confirm, realtime через `/hubs/game-setup`;
- страницы регистрации: `game-application` (игроки) и `team-registrations` (admin) — HTTP через `src/features/game-registration/api/`; planned UI-блоки показываются только когда регистрация ещё не открыта.

## Структура API-слоя

- `src/shared/api/client/` — общий `httpClient`;
- `src/shared/api/contracts/` — generated transport types;
- `src/shared/api/fetch-not-found-as-null.ts` — 404 → `null` для snapshot-read endpoints;
- `src/features/game-registration/api/` — registration transport (не routed page; используют `game-application` и `team-registrations`);
- `src/features/*` — UI, hooks и feature-local data access (board, setup, auth).

## Источник контрактов

Frontend не держит transport-контракты вручную как отдельную правду. Канонический источник - `../backend/openapi/deadmans.v1.yaml`.

Сгенерировать transport-артефакты:

```bash
npm run generate:transport
```

(`generate:contracts` — HTTP/OpenAPI schemas; `generate:realtime` — hub paths и event names из `x-signalr`.)

## Режим API

Frontend использует общий `httpClient`.

- `GET /api/game` идёт через относительный `/api` base URL;
- `POST /api/game/cells/{cellId}/open` идёт через тот же API transport;
- auth-запросы идут на backend origin для `/auth/*`;
- realtime hubs: пути и события из OpenAPI `x-signalr`, код в `src/shared/realtime/generated.ts` (`buildRealtimeHubUrl`);
- все запросы отправляют `credentials: 'include'`.

`VITE_BACKEND_ORIGIN`:

- в `dev` можно не задавать (используется `http://localhost:5285`);
- вне `dev` рекомендуется задать явно;
- значение должно быть абсолютным origin (например, `https://api.example.com`, без пути);
- если не задан, frontend использует `window.location.origin` (same-origin deployment).

## Локальный запуск

Backend должен быть поднят по инструкции в [`docs/development.md`](../docs/development.md) (`backend/scripts/setup-local.ps1` / `setup-local.bat`).

```bash
npm install
npm run dev
```

Из корня репозитория: `npm run dev:frontend` или `npm run dev`.

По умолчанию dev-server проксирует `/api` на `http://localhost:5285`.

## Сборка

```bash
npm run build
```

## Ограничение текущего скоупа

На текущем этапе frontend содержит Twitch auth, panel shell, role-aware routing, game board, admin game setup и registration UI (с planned-моками для ещё не подключённых кнопок). Lifecycle-кнопки и admin invite UI пока только в roadmap-блоках.
