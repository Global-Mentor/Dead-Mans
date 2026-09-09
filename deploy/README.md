# Production в Coolify

На VPS размещаются Coolify, приложение и PostgreSQL. Медиа и зашифрованные резервные копии лучше хранить в двух разных S3 bucket за пределами VPS. Для bucket с медиа разрешается только публичное чтение объектов без listing; запись доступна лишь приложению. Bucket с backup остаётся полностью приватным.

1. Закрыть публичный порт PostgreSQL и подключить к нему постоянный volume. Production-соединение должно использовать TLS с `SSL Mode=VerifyFull`.
2. Создать в Coolify приложение из образа `ghcr.io/<owner>/<repo>:main`. Назначить приложению домены `https://deadman.bug.community` и `https://bug.community`, внутренний порт — `8080`, health check — `/health/ready`. Приложение само перенаправляет все запросы с корневого домена на `https://deadman.bug.community`, сохраняя путь и query string.
3. Если GHCR package приватный, добавить в Coolify registry `ghcr.io`, имя GitHub-пользователя и token только с правом `read:packages`.
4. Перенести переменные из `.env.example` в Coolify. В `TwitchAuth__PermanentSuperAdminTwitchUserIds__0` указать числовой Twitch ID владельца — без него Production намеренно не запустится. Секреты хранить только в панели.
5. Подключить volume к `/var/lib/deadmans/keys` и CA-сертификат PostgreSQL к `/run/secrets/postgres-ca.crt` в режиме read-only.
6. В GitHub Environment `production` добавить секреты `COOLIFY_TOKEN`, `COOLIFY_WEBHOOK`, переменную `PRODUCTION_HEALTH_URL=https://deadman.bug.community/health/ready` и переменную репозитория `PRODUCTION_DEPLOY_ENABLED=true`.
7. Настроить ежедневный backup PostgreSQL в отдельный S3 bucket и проверить восстановление до открытия доступа пользователям.

После получения публичного IPv4 VPS в DNS Porkbun понадобятся две `A`-записи: корневая запись с пустым `Host` и запись с `Host=deadman`; обе указывают на один адрес VPS. Парковочные `A`/`CNAME`-записи Porkbun перед этим удаляются. Wildcard-запись не нужна.

В Twitch Developer Console разрешённый OAuth callback должен в точности совпадать с `https://deadman.bug.community/auth/twitch/callback`.

`PRODUCTION_DEPLOY_ENABLED` включается после первого ручного запуска и проверки Twitch callback. После этого push в `main` проходит CI, публикует новый образ и запускает Coolify автоматически. Для отката можно указать в Coolify сохранённый образ с тегом commit SHA.
