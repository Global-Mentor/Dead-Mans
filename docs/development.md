# Development Workflow

Единая operational-инструкция для локальной разработки, проверки и синхронизации generated-артефактов.

## Prerequisites

- Docker (Compose support)
- .NET 10 SDK (точная feature band закреплена в `global.json`)
- Node.js LTS

Восстановите закреплённые .NET tools из корня репозитория:

```bash
dotnet tool restore
```

Команды EF запускайте через локальный manifest, чтобы версия CLI совпадала с runtime-пакетами:

```bash
dotnet tool run dotnet-ef migrations has-pending-model-changes --project backend/backend.csproj --startup-project backend/backend.csproj --no-build
```

## First-Time Setup

### Windows (bat wrappers in repo root)

```bat
setup-local.bat
```

### macOS/Linux (or cross-platform PowerShell)

```bash
pwsh backend/scripts/setup-local.ps1
```

`setup-local` поднимает docker-инфраструктуру, применяет миграции и подготавливает тестовые media.
На Windows `setup-local.bat` и `dev-full.bat` сначала запускают
`backend/scripts/ensure-docker-desktop.ps1`: если Docker Engine недоступен, скрипт завершает
только процессы Docker Desktop, переносит повреждённые transient socket-каталоги `run` и
`docker-secrets-engine` в `%LOCALAPPDATA%\Docker\runtime-quarantine`, запускает Desktop скрыто
и ждёт готовности Engine. Volumes, images и project data не удаляются.

## Daily Development

Во время разработки можно быстро пробовать варианты UI и поведения без запуска тестовых наборов после каждой правки. Точечную проверку проводите, когда она помогает ответить на конкретный вопрос или найти причину регрессии; при передаче результата отмечайте, что ещё не проверено. Передача промежуточной реализации сама по себе не требует полного прогона.

Перед подготовкой коммитов или объявлением изменений готовыми к ним проведите глубокое ревью всего планируемого diff, уберите заменённый код и временные следы, выполните все применимые отложенные проверки на итоговом коде. Для frontend сюда входят полный quality gate, а для UI также заполненные браузерные сценарии и визуальная проверка; для backend, контрактов и БД - соответствующие проверки. Ошибки исправьте до создания коммитов и не выдавайте отложенные проверки за пройденные.

### Единая типографика frontend

Гарнитура Alegreya Variable загружается локально в `frontend/src/main.tsx`.
Единственное место задания семейства и начертания цифр - CSS-переменные
`--app-font-family` и `--app-font-numeric` в `frontend/src/index.css`.
`huntTypography` и тема MUI используют эти переменные; обычные HTML-поля
наследуют их автоматически, включая элементы в модалках и меню вне `#root`.
Для цифр используется `lining-nums tabular-nums`: единая высота и ширина.

В новых компонентах используйте варианты `Typography` и общую тему, без
локальных названий шрифтов или сброса `font-variant-numeric`. При замене
гарнитуры обновляйте импорт, CSS-переменную и браузерную проверку типографики.
`frontend/e2e/typography.spec.ts` проверяет страницы панели на en/ru/uk/pl,
наследование обычными HTML-полями и фактический шрифт украинских и польских букв.
Существующие браузерные сценарии также проверяют формы, модалки и production-сборку.

### Full stack from repo root

```bash
npm install
npm run dev
```

Если Twitch Bot включён в локальной конфигурации, API запускается вместе с EventSub-прокси
на порту 5290. Для настроенного адреса `*.trycloudflare.com` запуск также поднимает или
использует текущий Docker-туннель и передаёт API его актуальный URL. Это же поведение
используют `npm run dev:backend` и `dev-backend.bat`; отдельная команда прокси не нужна.
Подробности и настройка аккаунтов: [Twitch Bot](twitch-bot.md#local-real-channel-testing).

### Windows alternative

```bat
dev-full.bat
```

## Reset Local Data (Destructive)

### Windows

```bat
reset-local.bat
```

### macOS/Linux (or cross-platform PowerShell)

```bash
pwsh backend/scripts/reset-local.ps1
```

## Transport Contract Workflow

Source of truth: `backend/openapi/deadmans.v1.yaml` (HTTP + SignalR in `x-signalr`).

After transport contract changes:

```bash
npm --prefix frontend run generate:transport
```

This regenerates:

- `frontend/src/shared/api/contracts/generated.ts`
- `frontend/src/shared/realtime/generated.ts`

Optional partial regeneration:

- `npm --prefix frontend run generate:contracts` (HTTP/OpenAPI schemas only)
- `npm --prefix frontend run generate:realtime` (SignalR hubs/events only)

Do not hand-edit generated files.

## Verification Before Commit and PR

Keep local review reports, execution notes, prompt copies and generated screenshots in ignored directories. Maintained documentation belongs in `docs/`; temporary work records do not. After staging, run `npm run check:repository-hygiene`. CI rejects tracked files covered by the repository's `.gitignore` files, including files added with `git add --force`.

- Backend tests:
  - `dotnet build backend/backend.slnx --configuration Release`
  - `dotnet test backend/backend.slnx --configuration Release --no-build`
  - `dotnet tool run dotnet-ef migrations has-pending-model-changes --project backend/backend.csproj --startup-project backend/backend.csproj --configuration Release --no-build`
- Frontend quality gate:
  - `npm --prefix frontend run check`
  - включает Prettier check, строгий TypeScript, ESLint, locale consistency и поиск hardcoded UI-текста, Vitest с V8 coverage для критичных модулей, Knip и production build
  - отдельный coverage-прогон: `npm --prefix frontend run test:coverage`
- Generated artifacts are up to date:
  - run `npm --prefix frontend run generate:transport`
  - ensure no unexpected git diff in generated paths

CI собирает и тестирует backend в `Release`, блокирует расхождение EF-модели с миграциями,
устанавливает frontend dependencies через `npm --prefix frontend ci` и запускает тот же
`npm --prefix frontend run check`, поэтому локальная проверка совпадает с pull request pipeline.

Playwright smoke tests используют перехват HTTP на уровне браузера и не зависят от Twitch,
локальной БД или секретов. Локальный запуск после установки Chromium:

```powershell
npx --prefix frontend playwright install chromium
npm --prefix frontend run test:e2e
```

CI запускает Chromium smoke для anonymous redirect, role-based routing и доступа администратора
к каталогу вопросов после основного frontend quality gate.


## OBS overlay

Страница `/panel/game-overlay` доступна модераторам и администраторам. Создайте ссылку,
скопируйте её в источник OBS «Браузер» и установите размер 1920 x 1080.
Кнопка `Test Overlay` заменяет содержимое вашего источника изображением
`/brand/share-card.svg`, векторным исходником PNG-превью ссылок. «Завершить тест» возвращает
текущую игровую сцену. Режим относится только к вашей ссылке, работает без активной
игры и сохраняется при перезагрузке OBS или панели. Игра и таймеры продолжаются.
Перевыпуск и отзыв ссылки отключают тест. Состояние читается и изменяется через
`GET/PUT /api/overlay/test` с авторизацией модератора или администратора; сама
OBS-ссылка остаётся только для чтения.
Оверлей не требует входа в аккаунт внутри OBS. Пустое состояние прозрачно; после выбора
активной команды видны её название, состав и доска. Открытие карточки скрывает доску.
В фазах `card_opened`, `awaiting_modifiers` и `preparing` видны карточка и модификаторы;
одинаковые модификаторы объединены по ID, плотный список занимает две колонки без страниц.
На этапе `preparation_completed` экран полностью очищается до отдельного начала игры.
Во время игры команда скрыта, справа остаются иконки модификаторов и серверные таймеры.

Для отдельного профилирования production-оверлея соберите frontend и запустите
`MEASURE_OVERLAY_PERF=1 npx playwright test e2e/overlay-performance.spec.ts --workers=1`
из `frontend` (в PowerShell переменную задают через `$env:MEASURE_OVERLAY_PERF='1'`).
По умолчанию измеряются пять минут работы отсчётов и 60 переходов между сценами.
`OVERLAY_SOAK_MS` меняет длительность наблюдения, `PERF_LABEL` - имя локального JSON-отчёта
в `.tmp/agent-work/performance`. Сравнивайте сборки на одном компьютере при одинаковой нагрузке;
эти браузерные измерения не являются измерениями нагрузки OBS или захвата игры.
Для локальной записи переходов на игровых фонах используйте `e2e/overlay-visual-review.spec.ts`
с `OVERLAY_BACKGROUND_DIR`, указывающим на каталог изображений `hunt-day.jpg`, `hunt-dark.jpg`
и `hunt-interior.png`. Изображения и видеозаписи остаются в локальных материалах проверки.
Для записи видео требуется бинарник Playwright FFmpeg (`npx playwright install ffmpeg`).
При подведении итогов команда остаётся в общей полоске над центральной формой, нулевые строки и
предварительный счёт обновляются по мере заполнения оператором. Финальный результат
остаётся на этапе «Показ итогов» до команды «Завершить показ». До неё следующий раунд
и завершение игры заблокированы. Перезагрузка OBS сохраняет показ. В расчёте отображаются
только модификаторы с начислением очков; игровые правила без очков не создают нулевые строки.
Ссылка следует за текущей активной игрой. Подробные правила расположения:
[Broadcast presentation](development/frontend-ui-system.md#broadcast-presentation).

У каждого пользователя одна действующая ссылка. Перевыпуск отключает предыдущую,
отзыв отключает текущую; оба действия находятся на той же странице. Ключ возвращается
один раз, не сохраняется в browser storage и хранится на сервере только как SHA-256 хеш.
Исходный ключ остаётся в настройках источника OBS. Не публикуйте его и не добавляйте
в журналы или Git. Перед локальным использованием нужна миграция `AddGameOverlayKeys`.

Оверлей получает сигнал `frameChanged` через отдельный `/hubs/game-overlay` и читает
авторитетный `/api/overlay/snapshot` с ключом в `X-Overlay-Key`. SignalR использует
LongPolling, чтобы браузер передавал ключ в заголовке, а не в URL. Hub не содержит
клиентских методов и передаёт только уведомление без данных игры. Резервный опрос
выполняется раз в 10 секунд при соединении и раз в 2 секунды без него. Серии событий
объединяются за 150 мс; запросы обновления не запускаются параллельно. При нескольких
репликах без общего SignalR backplane резервный опрос обеспечивает сходимость снимка.
Во frontend URL ключ находится после `#`, поэтому не попадает в HTTP URL и Referer.
Отдельная схема аутентификации разрешает только снимок и этот hub; ключ не заменяет сессию
аккаунта, не даёт ролей и не подходит для команд или обычного API игры. Отключение
аккаунта владельца, снятие или истечение его служебной роли также отключают доступ по ссылке.
Аутентификация проверяет ключ и права на каждом HTTP-запросе, включая очередной long poll.
Все ответы API имеют `Cache-Control: no-store`.

Снимок команды, текущей фазы, доски и раунда читается в одной транзакции Repeatable Read.
Название и изображение карточки берутся из неизменяемого снимка раунда, названия и иконки
модификаторов - из снимков активаций. Имена и ID активировавших игроков не передаются.
Отменённые и архивные активации не показываются. Доска читает сохранённый итог последнего
завершённого раунда каждой карточки без пересчёта исторических модификаторов.
Закрытые карточки не раскрывают названия, описание, тип или медиа. В снимке нет вопросов,
ответов, внутренних ID игроков и административных данных. Доска передаётся только
во время выбора карточки. На временных ошибках запросы замедляются до 30 секунд;
через 15 секунд без свежего снимка экран очищается. Ответ 401 очищает экран и останавливает
периодические запросы. После восстановления сети данные загружаются заново.

Проверки: `frontend/e2e/game-overlay.spec.ts`, OBS-сценарий в `production-runtime.spec.ts`,
backend-тесты `GameOverlayContractTests`, `DbGameOverlayRepositoryTests` и `GameOverlayKeyTests`.
Последний набор использует отдельную временную PostgreSQL-базу через общий test fixture.
