# Production в Coolify

На VPS размещаются Coolify, приложение и PostgreSQL. Медиа и зашифрованные резервные копии лучше хранить в двух разных S3 bucket за пределами VPS. Для bucket с медиа разрешается только публичное чтение объектов без listing; запись доступна лишь приложению. Bucket с backup остаётся полностью приватным.

1. Закрыть публичный порт PostgreSQL и подключить к нему постоянный volume. Production-соединение должно использовать TLS с `SSL Mode=VerifyFull`.
2. Создать в Coolify приложение из образа `ghcr.io/<owner>/<repo>:main`. Внутренний порт — `8080`, health check — `/health/ready`.
3. Если GHCR package приватный, добавить в Coolify registry `ghcr.io`, имя GitHub-пользователя и token только с правом `read:packages`.
4. Перенести переменные из `.env.example` в Coolify. Секреты хранить только в панели.
5. Подключить volume к `/var/lib/deadmans/keys` и CA-сертификат PostgreSQL к `/run/secrets/postgres-ca.crt` в режиме read-only.
6. В GitHub Environment `production` добавить секреты `COOLIFY_TOKEN`, `COOLIFY_WEBHOOK`, переменную `PRODUCTION_HEALTH_URL` и переменную репозитория `PRODUCTION_DEPLOY_ENABLED=true`.
7. Настроить ежедневный backup PostgreSQL в отдельный S3 bucket и проверить восстановление до открытия доступа пользователям.

`PRODUCTION_DEPLOY_ENABLED` включается после первого ручного запуска и проверки Twitch callback. После этого push в `main` проходит CI, публикует новый образ и запускает Coolify автоматически. Для отката можно указать в Coolify сохранённый образ с тегом commit SHA.
