## Dead-Mans - контекст проекта

Этот файл нужен как короткая актуальная карта репозитория: что уже реализовано, где проходят архитектурные границы и на что опираться при следующих изменениях.

---

## Как использовать этот файл

Если возвращаешься в проект после паузы, этот файл должен быть первой точкой входа. Он не заменяет `README.md`, `STACK.md` и архитектурные доки, а сжимает их в рабочую карту:

- что является активным контуром;
- какие части приложения уже живы;
- где проходят архитектурные границы;
- какие инварианты нельзя ломать при дальнейшей разработке;
- в каком порядке заново входить в проект.

---

## Принятый курс

- Проект на ранней стадии, критичных данных в БД нет, поэтому смена технологического baseline выполняется сейчас.
- Целевой курс: **DigitalOcean-first** окружение с максимально близкой локалкой.
- Зафиксированный стек и инфраструктурные правила: `STACK.md`.
- Базовый принцип: локальная разработка с инфраструктурой в контейнерах (`postgres + minio`), приложение запускается из исходников; production-путь остаётся DigitalOcean-first и env-driven.

---

## Источники правды

Чтобы проект не "расползался" по нескольким конкурирующим описаниям, держим явные источники правды:

- архитектурный и продуктовый контекст: `CONTEXT.md`;
- инфраструктурный и технологический курс: `STACK.md`;
- общий локальный запуск и обзор репозитория: `README.md`;
- обзор потоков и границ: `docs/architecture/overview.md`;
- transport-контракт: `backend/openapi/deadmans.v1.yaml` (HTTP + SignalR в `x-signalr`);
- frontend transport types: generated из OpenAPI в `frontend/src/shared/api/contracts/` и `frontend/src/shared/realtime/generated.ts`.

Если меняется один из этих слоёв, изменения должны пройти по всей цепочке зависимых файлов и документации, а не остаться локальным исключением.

---

## 1. Что это за проект

**Dead-Mans** - панель управления для стрима и интерактивных игровых сценариев.

Основные сценарии:
- авторизация через Twitch.
- просмотр игрового поля из БД.
- открытие ячеек администраторами с realtime-синхронизацией для подключённых клиентов.

---

## 2. Активный контур

В активной разработке находятся только:
- `frontend/`
- `backend/`

`legacy-v1/` хранится в репозитории только как reference-источник старой логики и UX-идей. Новый код туда не добавляется.

---

## 3. Текущее устройство фронтенда

Фронтенд живёт в `frontend/` и представляет собой React SPA с feature-first структурой:

- `src/app/` - composition root, providers, theme;
- `src/routes/` - route config;
- `src/features/*` - feature UI, hooks/model и feature-facing data access;
- `src/shared/api/client/` - общий HTTP transport;
- `src/shared/api/config.ts` - единая env-конфигурация (`VITE_API_BASE_URL`, `VITE_BACKEND_ORIGIN`);
- `src/shared/api/contracts/` - generated transport types из OpenAPI и стабильные alias-типы;
- `src/shared/auth/` - auth context, API и route guards;
- `src/locales/` - языковые ресурсы.

### Что важно архитектурно

- auth HTTP использует тот же общий `httpClient`, что и игровые API, только с другим `baseUrl` для `/auth/*`;
- transport-типы импортируются централизованно из `src/shared/api/contracts/index.ts`.

### Основные страницы

- `AuthLandingPage` - вход через Twitch.
- `TwitchAuthCallbackPage` - завершение OAuth flow и восстановление сессии.
- `GameBoardPage` - игровое поле из БД с admin-only открытием ячеек.
- `GameSetupPage` - admin-настройка общего черновика игры (Save, layout, cell media, SignalR sync).

### Актуальный shell панели

- Внутренний раздел приложения живёт под `panelRootPath` (`/panel`).
- Панель использует общий `MainLayout`.
- Навигация по внутренним разделам строится декларативно через `src/routes/app-routes.ts`.
- Правая панель навигации показывает только те разделы, которые доступны текущему пользователю по ролям.
- Даже если frontend скрывает пункт навигации, доступ к маршруту всё равно должен проверяться через общие route/access helpers, а не только через UI.

Фронтенд работает через backend HTTP API.

---

## 4. Текущее устройство backend

Backend живет в `backend/` и представляет собой layered ASP.NET Core Web API:

- `Api/Contracts/` - HTTP DTO;
- `Api/Mapping/` - mapping application-моделей в transport DTO;
- `Application/` - use-case сервисы и repository/auth ports;
- `Domain/` - доменные модели и правила;
- `Infrastructure/` - adapters и DI;
- `Data/` - EF Core `ApplicationDbContext`, entities, configurations, migrations (Npgsql/PostgreSQL baseline);
- `Controllers/` - thin HTTP layer;
- `openapi/deadmans.v1.yaml` - канонический transport source of truth.

### Важный текущий split

- игровое поле (`IGameBoardRepository`, `GET /api/game`, `POST /api/game/cells/{cellId}/open`) работает через persistence-backed adapter (EF Core/PostgreSQL);
- auth, users и roles уже DB-backed через `ApplicationDbContext` и EF Core;
- медиа ячеек отдаются как публичные URL, собранные backend из storage metadata;
- изменения состояния ячеек рассылаются подключённым клиентам через SignalR hub.

### Auth flow

- `GET /auth/twitch/login` - редиректит на Twitch OAuth;
- `GET /auth/twitch/callback` - завершает Twitch login, upsert'ит пользователя и ставит auth cookie; при отклонённом входе или неактивном аккаунте редиректит frontend на callback-страницу с `reason=*`;
- `GET /auth/me` - возвращает текущую сессию;
- `POST /auth/logout` - завершает сессию.

Runtime-роли для backend-авторизации считаются из БД на каждом аутентифицированном запросе. Cookie хранит identity/session claims, а не долгоживущий snapshot ролей.
Деактивированные пользователи не могут получить новую auth-сессию; существующая cookie-сессия отклоняется middleware на `/api/*`, `/auth/*` и `/hubs/*` (401 + sign-out), а не только на `/auth/me`. `POST /auth/logout` требует заголовок `X-Dead-Mans-Api-Client: 1` (его выставляет frontend `httpClient`). Права на игровые endpoint'ы задаются выборочно на уровне самих контроллеров/действий.
Закрытые ячейки в `GET /api/game` не отдают `title`/`description` в JSON (только после открытия).

Auth требует корректно настроенный `ApplicationDbContext`. Если backend запущен без persistence-конфигурации, старт должен завершаться явной ошибкой, а не оставлять приложение в полу-рабочем состоянии.

---

## 5. Контракты и Swagger

Канонический source of truth для transport-контрактов:

- `backend/openapi/deadmans.v1.yaml`

Frontend генерирует типы через:

```bash
npm --prefix frontend run generate:contracts
```

Swagger UI в development должен смотреть на тот же YAML-файл, чтобы документация и generation не расходились.

---

## 6. Архитектурные инварианты

Это те правила, которые должны переживать отдельные задачи и чаты:

- активный код живёт только в `frontend/` и `backend/`;
- `legacy-v1/` можно читать, но нельзя использовать как место для нового кода;
- frontend остаётся feature-first, а не превращается в слой случайных util-файлов;
- page/layout-компоненты остаются тонкими, а orchestration/data access/role logic уходит в hooks, route helpers и feature modules;
- backend остаётся layered: controllers не ходят напрямую в EF/infrastructure;
- transport DTO, application-модели и domain-модели не смешиваются;
- OpenAPI сначала обновляется как контракт, затем синхронизируются backend mapping/endpoint'ы и frontend generated types;
- frontend role gating - это UX, а не security boundary; реальные права проверяются на backend, включая admin-only открытие ячеек;
- конфигурационные и persistence-проблемы должны проявляться явно на старте, а не оставлять приложение в полу-рабочем состоянии;
- новые решения должны расширять уже выбранный паттерн, а не создавать второй конкурирующий способ делать то же самое.

---

## 7. Качество решений

При следующих изменениях ориентир такой:

- одинаковые задачи должны решаться одинаковыми по стилю способами;
- новые абстракции вводятся только если они реально очищают границу или убирают повтор;
- `shared/` не должен становиться свалкой feature-логики;
- user-facing текст проходит через i18n;
- security и role checks не размазываются между несколькими слоями без необходимости;
- при структурных изменениях обновляются docs, а не только код;
- если уже есть хороший паттерн в проекте, его лучше продолжить, чем изобретать новый "чуть удобнее" локально.

---

## 8. Что уже реализовано

- feature-first фронтенд с `app/`, `routes/`, `features/`, `shared/`, `locales/`;
- auth context и protected route для панели;
- Twitch login flow с backend cookie session;
- game API на панели: `GET /api/game`, `POST /api/game/cells/{cellId}/open`, realtime sync через SignalR (после успешной записи в БД publish best-effort, см. `docs/architecture/realtime.md`);
- game setup для admin: `GET/POST/PUT/DELETE /api/game/setup` — один общий черновик в БД; `PUT` с `expectedVersion` и `409` при конфликте; `POST/DELETE /api/game/setup/cells/{cellId}/media` — изображения сразу в bucket; realtime: hub/event в OpenAPI `x-signalr` (`/hubs/game-setup`, `draftChanged`); на frontend текстовые поля сохраняются кнопкой Save, layout — при подтверждении в диалоге, без `localStorage`;
- централизованный query key слой на frontend;
- общий `httpClient` для frontend API;
- OpenAPI contract generation для frontend;
- role-aware panel routing и правая navigation drawer для внутренних разделов панели;
- безопасный локальный backend bootstrap через `backend/scripts/setup-local.ps1` без удаления БД и storage;
- отдельный destructive reset через `backend/scripts/reset-local.ps1` с подтверждением;
- backend tests для auth transport-контрактов;
- документация по стеку и архитектуре.

---

## 9. Что важно не забыть

- активный код живёт только в `frontend/` и `backend/`;
- `legacy-v1/` можно читать, но нельзя использовать как источник прямого копирования;
- backend controllers должны зависеть от application services/ports, а не от EF/infrastructure напрямую;
- transport DTO нельзя смешивать с application/domain моделями;
- user-facing строки должны проходить через i18n;
- при изменении transport-контракта сначала обновляется OpenAPI, потом регенерируются frontend types.

---

## 10. Быстрый возврат в проект

Если открываешь репозиторий после паузы:

1. Прочитай `README.md`.
2. Посмотри `docs/architecture/overview.md`.
3. Прочитай этот `CONTEXT.md` целиком и восстанови в голове инварианты.
4. Проверь `frontend/src/features/*`, `frontend/src/routes/` и `backend/Application/`.
5. Убедись, что OpenAPI и generated contracts синхронизированы.
6. Локальный bootstrap: `backend/scripts/setup-local.ps1` (см. README; Windows — `setup-local.bat` при необходимости).
7. Разработка: из корня `npm install`, `npm run dev` (или `dev-full.bat` на Windows).
8. Сброс данных: `backend/scripts/reset-local.ps1` или `reset-local.bat`.
9. Для auth-проверок не забывай, что backend требует настроенный DB-backed `ApplicationDbContext`.
