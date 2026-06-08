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
- страница `game-setup` (admin): общий черновик в БД (`GET/POST/PUT/DELETE /api/game/setup`), выбор enabled modifiers в draft (`enabledModifierCodes`), медиа ячеек (`POST/DELETE /api/game/setup/cells/{cellId}/media`), Save + layout confirm, realtime через `/hubs/game-setup`;
- блок модификаторов на `game-board`: каталог из `GET /api/game/modifiers/catalog`, активация через `POST /api/game/modifiers/{modifierCode}/activate` (admin/moderator), realtime через событие `modifierActivated` на `/hubs/game-board`;
- блок вопросов в `game-setup`: каталог (`GET /api/game/questions/catalog`) с поиском/фильтрацией и enable/disable вопросов/категорий; runtime ask/answer/history endpoints пока доступны только на backend и через generated-контракты;
- страницы регистрации: `game-application` (игроки) и `team-registrations` (admin) — HTTP через `src/features/game-registration/api/`; planned UI-блоки показываются только когда регистрация ещё не открыта.

## Структура API-слоя

- `src/shared/api/client/` — общий `httpClient`;
- `src/shared/api/contracts/` — generated transport types;
- `src/shared/api/fetch-not-found-as-null.ts` — 404 → `null` для snapshot-read endpoints;
- `src/shared/api/query-keys.ts` — централизованные query keys для TanStack Query;
- `src/features/game-registration/api/` — registration transport (не routed page; используют `game-application` и `team-registrations`);
- `src/features/game-registration/index.ts` — public API registration feature (без deep imports из соседних фич);
- `src/features/game-modifiers/index.ts` — public API modifiers feature;
- `src/app/panel-route-config.tsx` — единый источник panel routes (метаданные, lazy-страницы, optional realtime-sync);
- `src/app/AppRoutes.tsx` + `src/app/app-route-tree.tsx` — дерево маршрутов (`useRoutes`);
- `src/routes/app-routes.ts` — re-export метаданных, guards и access helpers;
- `src/layouts/` — shell-компоненты панели (`MainLayout`, `PanelNavigationDrawer`);
- `src/shared/auth/panel-capabilities.ts` + `use-panel-capabilities.ts` — capability-level access helpers (`gameSetup`, `modifierActivation`) поверх route-level role checks;
- `src/features/*` — UI, hooks и feature-local data access (board, setup, auth).

## UI и стили (единый стандарт)

Фронтенд использует один визуальный baseline в стиле Hunt: Showdown (мрачный фронтир, латунь, мох, пергамент):

- `src/shared/theme/hunt-palette.ts` — каноническая палитра (единственный источник raw colors);
- `src/shared/theme/tokens.ts` — `huntTypography`, spacing и brand tokens;
- `src/shared/theme/surface-sx.ts` — переиспользуемые surface/title/auth presets (`huntPanelSx`, `huntAuthCardSx`, …);
- `src/app/theme/appTheme.ts` — MUI theme: palette, typography, component overrides, `theme.custom.gradients`;
- feature-local presets живут в `features/<feature>/theme/`:
  - `game-board/theme/board-cell-sx.ts`, `modifier-item-sx.ts`
  - `game-setup/theme/layout-sx.ts`, `setup-cell-sx.ts`, `cell-image-sx.ts`;
- `src/shared/ui/` - переиспользуемый UI-слой с явной вложенной структурой:
  - `primitives/` - базовые контролы и атомарные building blocks;
  - `patterns/` - типовые секции/компоновка страниц;
  - `feedback/` - диалоги, toast, загрузка и state-panels;
  - `index.ts` - единый публичный barrel для импортов в фичах.

Ключевые reusable-компоненты:

- primitives: `AppButton`, `AppLinkButton`, `FormTextField`, `FormSelect`, `SectionCard`;
- patterns: `PageShell`, `SectionHeader`, `BoardMatrix`, `AsyncSection`, `AuthScreenShell`;
- feedback: `AppDialog`, `ConfirmDialog`, `AppToast`, `PageStatePanel`, `CenteredProgress`.

Правило миграции и дальнейшей разработки:

- layout-уникальность — локально в `sx`;
- повторяемые visual patterns — только через theme override или `shared/ui`;
- межфичевые импорты — через public API (`features/<feature>/index.ts`), без deep-import в `api/`/`model/` соседа;
- не вводим второй styling-подход параллельно MUI (`CSS Modules`, `Tailwind`, отдельный runtime-styling).

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

## Локальная проверка

```bash
npm run check:locales
npm run lint
npm run build
```

## Ограничение текущего скоупа

На текущем этапе frontend содержит Twitch auth, panel shell, role-aware routing, game board, admin game setup и registration UI (с planned-моками для ещё не подключённых кнопок). Lifecycle-кнопки и admin invite UI пока только в roadmap-блоках.
