# Production в Coolify

На VPS размещаются Coolify, приложение и PostgreSQL. Медиа и зашифрованные резервные копии лучше хранить в двух разных S3 bucket за пределами VPS. Для bucket с медиа разрешается только публичное чтение объектов без listing; запись доступна лишь приложению. Bucket с backup остаётся полностью приватным.

1. Создать отдельный PostgreSQL 16 с постоянным volume и без публичного порта. Включить SSL и `verify-full` в Coolify. В строке соединения использовать внутреннее DNS-имя БД, которое присутствует в SAN сертификата, `SSL Mode=VerifyFull` и `Root Certificate=/run/secrets/postgres-ca.crt`. Не заменять это имя условным `postgres.internal` из примера.
2. Создать Docker Image application с Image Name `ghcr.io/global-mentor/dead-mans`. Для первого запуска выбрать digest образа из успешного CI на проверенном `main`; не разворачивать старый `main`. В поле Tag or Hash Coolify digest записывается как `sha256-<64 hex>`. Назначить приложению домены `https://deadman.bug.community` и `https://bug.community`, внутренний порт — `8080`. Приложение перенаправляет запросы с корневого домена с кодом 308, сохраняя путь и query string.
3. Если GHCR package приватный, добавить в Coolify registry `ghcr.io`, имя GitHub-пользователя и token только с правом `read:packages`.
4. Перенести переменные из `.env.example` в Coolify. ID постоянного superadmin — `184098114`. Секреты хранить только в Coolify или GitHub Environment `production`. Для forwarded headers определить реальный CIDR сети proxy через `docker network inspect`; не доверять всем сетям.
5. Подключить volume к `/var/lib/deadmans/keys` с правом записи для пользователя `app` (UID уточнить через `id` в образе). Подключить `/data/coolify/ssl/coolify-ca.crt:/run/secrets/postgres-ca.crt:ro`. Проверить читаемость CA пользователем приложения. Использовать встроенный Docker HEALTHCHECK: он запрашивает `/health/ready` на loopback с canonical Host. Если Coolify заменяет его своим probe, задать эквивалентную команду с `Host: deadman.bug.community`; обращение с Host `127.0.0.1` намеренно отклоняется приложением.
6. Оставить repository variable `PRODUCTION_DEPLOY_ENABLED=false` до успешного ручного запуска и всех проверок ниже. Затем в GitHub Environment `production` добавить секреты `COOLIFY_TOKEN`, `COOLIFY_WEBHOOK` и переменную `PRODUCTION_HEALTH_URL=https://deadman.bug.community/health/ready`. Token должен разрешать чтение приложения/деплоя, изменение image tag и запуск деплоя. Webhook — HTTPS URL `/api/v1/deploy?uuid=<UUID приложения>&force=false`, строго для одного приложения.
7. Настроить ежедневный backup PostgreSQL в отдельный S3 bucket и проверить восстановление до открытия доступа пользователям.

После получения публичного IPv4 VPS в DNS Porkbun понадобятся две `A`-записи: корневая запись с пустым `Host` и запись с `Host=deadman`; обе указывают на один адрес VPS. Парковочные `A`/`CNAME`-записи Porkbun перед этим удаляются. Wildcard-запись не нужна.

В Twitch Developer Console разрешённый OAuth callback должен в точности совпадать с `https://deadman.bug.community/auth/twitch/callback`.

## Проверка первого запуска

До merge `develop → main` должны пройти backend suite с реальным PostgreSQL, frontend `check`, browser smoke, аудит зависимостей, проверка миграций и сборка/запуск production Docker image. Для ручной сборки передать `--build-arg RELEASE_SHA=<полный Git SHA>`.

После ручного деплоя проверить HTTPS обоих доменов, 308 с сохранением path/query, `/health/live` и `/health/ready`. Ответ readiness должен быть `200 Healthy` с `X-Release-Sha` выбранного коммита. Запросы без сессии к `/panel/game-board` должны вести на `/`, к защищённым API, OpenAPI и hubs — отклоняться. Проверить браузером Twitch login, роль superadmin, SignalR и загрузку/чтение/удаление медиа. `/auth/callback` должен загружать React без ошибок CSP. После redeploy с тем же volume сессия должна сохраниться. Проверить security headers и отсутствие секретов в логах.

На пустой БД схема создаётся миграциями при старте. Из соединения приложения проверить `SELECT ssl, version FROM pg_stat_ssl WHERE pid = pg_backend_pid();`: ожидается `ssl=true`. Отдельно проверить отказ соединения с неверным CA и неверным именем хоста. Одного флажка SSL в панели недостаточно.

## Релизы и откат

После ручных проверок и успешного восстановления backup включить `PRODUCTION_DEPLOY_ENABLED=true`. Push в `main` проходит CI, публикует SHA-тег и `main`, затем передаёт в Coolify **digest** опубликованного образа. CI ждёт завершения конкретного деплоя и ответа `Healthy` с SHA этого релиза; здоровая старая версия не считается успехом. Релизы, уже заменённые новым коммитом в `main`, пропускаются.

При проблеме сначала выключить `PRODUCTION_DEPLOY_ENABLED`, проверить очередь Coolify и сохранить логи без секретов. Не повторять запрос запуска вслепую после сетевого timeout: предыдущий запрос мог быть принят. Для отката выбрать сохранённый digest успешного релиза и выполнить Redeploy. Перед откатом оценить совместимость старого кода с уже применёнными миграциями; автоматического downgrade БД нет.

## Резервные копии и восстановление

В Coolify настроить ежедневный PostgreSQL backup в отдельный приватный S3 bucket вне VPS, отдельные credentials и retention. Включить шифрование bucket у провайдера и уведомления об ошибках backup. Медиа-приложению не давать доступ к bucket резервных копий. Сохранять также конфигурацию Coolify и Data Protection keys: одних данных приложения недостаточно для восстановления инфраструктуры и сессий.

Для теста скачать резервную копию из S3, создать **отдельную пустую БД PostgreSQL 16** и восстановить её подходящим для формата инструментом (`pg_restore` для custom dump, `psql` для SQL). Проверить историю миграций, контрольные записи и запуск отдельного экземпляра приложения. Тестовая БД не должна подменять production. Зафиксировать дату, объект backup, результат и время восстановления; до этого первый запуск не считается готовым. Плановый повтор — после изменения backup-настроек или миграций.

## Состояние подготовки на 10.09.2026

На GitHub установлен `PRODUCTION_DEPLOY_ENABLED=false`. Production ещё не развёрнут. IPv4, ОС/SSH, адрес панели Coolify, S3-провайдер и ресурсные UUID пока не подтверждены; их нужно вписать сюда после настройки. `main` ещё не обновлён до подготовленной версии приложения.

Локально прошли полный backend suite, frontend `check`, browser smoke и тесты деплоя; форматирование, typecheck, lint, Release/frontend build, миграции, OpenAPI и аудит зависимостей успешны. Проверка типов запускает `tsc` напрямую для `tsconfig.app.json` и `tsconfig.node.json`: прежний `tsc-files` мог возвращать ложный успех на Windows и удалён. Production Docker image собран и запущен non-root (UID 1654) за HTTPS proxy с пустой PostgreSQL 16 и HTTPS S3.

На этом стенде проверены миграции, TLS 1.3 и отказ с неверными CA/hostname, healthcheck и SHA релиза, canonical redirect, запрет анонимного доступа, CSP callback-страницы, оба SignalR hub по WSS, S3 upload/read/delete и запрет анонимного listing/backup-доступа. Сессия и key ring пережили пересоздание контейнера. Тестовый пользователь получил superadmin, снятие роли отклонено. Backup скачан обратно из отдельного тестового S3 bucket и восстановлен в новую БД с проверкой схемы и контрольной записи. Тестовые секреты в логах приложения не обнаружены.

Это локальная проверка с тестовой identity и частной CA. Настоящий Twitch OAuth, публичные сертификаты/DNS и offsite backup/restore ещё предстоит проверить на VPS. Docker-сборка также включена в CI каждого PR, чтобы ошибки упаковки выявлялись до merge.

Актуальные инструкции: [установка Coolify](https://coolify.io/docs/get-started/installation), [firewall и Docker](https://coolify.io/docs/knowledge-base/server/firewall), [PostgreSQL SSL](https://coolify.io/docs/databases/ssl). Для панели нужен согласованный HTTPS-поддомен: после его проверки можно закрыть внешние порты 8000/6001/6002. Один UFW не гарантирует блокировку опубликованных Docker-портов. Перед запретом root SSH перевести управление Coolify на отдельного пользователя и проверить новое соединение.
