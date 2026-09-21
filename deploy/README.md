# Deploying with Coolify

This guide covers the first production deployment of Dead Mans on a single VPS. Coolify runs the application and PostgreSQL. Media files and encrypted backups should live in separate S3 buckets outside the VPS.

## What you need

1. A 64 bit x86 VPS running a supported Ubuntu or Debian release.
2. A public IPv4 address and access to the domain DNS settings.
3. A Twitch application with its client ID and secret.
4. One S3 bucket for media and another private bucket for backups.

Install Coolify by following its [installation guide](https://coolify.io/docs/get-started/installation). Keep SSH, HTTP, and HTTPS reachable. The temporary Coolify setup ports can be closed after the panel has its own HTTPS hostname and remote access has been tested.

## DNS

Create two `A` records at Porkbun. The root record and `deadman` should both point to the VPS address. Remove any parking records that conflict with them. A wildcard record is not needed.

The public addresses are:

```text
https://deadman.bug.community
https://bug.community
```

The root domain redirects to `deadman.bug.community`. Keep DNS in direct mode without a CDN proxy so the application is served straight from the VPS.

## PostgreSQL

Create a PostgreSQL 16 service in Coolify with a persistent volume and no public port. Start with a new empty database and enable TLS.

The connection string must use `SSL Mode=VerifyFull` and a trusted CA certificate. Replace `postgres.internal` in [`deploy/.env.example`](.env.example) with the real internal database hostname covered by that certificate.

Configure a daily encrypted backup to the private backup bucket. Restore one backup into a separate test database before opening the application to users. The detailed first database rollout is documented in [`docs/runbooks/initial-production-database-rollout.md`](../docs/runbooks/initial-production-database-rollout.md).

## Application

Create a Docker Image application in Coolify with these values:

```text
Image: ghcr.io/global-mentor/dead-mans
Internal port: 8080
Domains: https://deadman.bug.community, https://bug.community
```

For the first deployment, select the digest produced by a successful `main` workflow. Coolify writes a digest in its tag field as `sha256-<digest>`. Do not deploy an older floating `main` tag by accident.

If the GHCR package is private, add a registry credential that has only the `read:packages` permission.

Copy the values from [`deploy/.env.example`](.env.example) into the Coolify environment settings and replace every placeholder. In particular, check the following values carefully:

1. The PostgreSQL hostname, password, and CA certificate.
2. The S3 endpoint, bucket, and credentials.
3. The Twitch client ID, secret, and callback addresses.
4. The trusted CIDR of the actual Coolify proxy network.

Mount a persistent volume at `/var/lib/deadmans/keys` and make it writable by the application user. Mount the PostgreSQL CA certificate at `/run/secrets/postgres-ca.crt` with read permission only. Never store production secrets in this repository.

The media bucket may allow public reads for individual objects. It must not allow anonymous listing or writing. The backup bucket must remain private and use separate credentials.

## First launch

Keep the GitHub repository variable `PRODUCTION_DEPLOY_ENABLED` set to `false` while preparing the server. Deploy the selected image manually, then verify the following:

1. `/health/live` and `/health/ready` return `200`.
2. `X-Release-Sha` matches the commit used to build the image.
3. The database is empty apart from the expected schema and technical records.
4. Twitch login, callback, and logout work on the public HTTPS domain.
5. The root domain redirects while preserving the path and query string.
6. SignalR updates and media upload, read, and delete operations work.
7. A redeployment keeps existing sessions because the data protection keys persist.
8. A PostgreSQL backup can be restored into a separate database.

Do not open the application to users until the readiness check and backup restore both succeed.

## Automatic deployments

### One-time multiple-choice quiz upgrade

The release containing `20260919151237_ConvertQuizToMultipleChoice` is an
in-place upgrade, not a new-database deployment. It removes the approved test
games, questions, gameplay history and points, while retaining users, access
rights, modifier catalogs and media. See the [database upgrade notes](../docs/architecture/database.md#pre-release-multiple-choice-upgrade).

For this release, keep `PRODUCTION_DEPLOY_ENABLED=false` until the maintenance
rollout is complete. Verify the restore procedure ahead of the maintenance
window. At cutover, stop every old application instance and worker first, take
and record a final backup of that read-only database, and only then start the
selected new image with `Database__ApplyMigrationsOnStartup=true` so migrations
run once against the existing database. Do not use a rolling deployment: old
and new versions are not schema-compatible.

Verify readiness, the release SHA, Twitch sign-in, retained users/access and the
new question workflow before reopening traffic and enabling automatic releases.
If rollback is necessary, restore the pre-upgrade backup together with the old
image; neither an image-only rollback nor `Down` restores discarded data. No
database deletion or connection-string change is needed for the upgrade.

### Embedded Twitch Bot rollout

The bot runs inside the existing backend image. No separate bot container,
development webhook proxy or Cloudflare tunnel is needed in production.
The current feature is quiz delivery, but the bot configuration is shared. Existing
`TwitchQuiz__*` variables remain supported; new configuration uses `TwitchBot__*`.
When renaming existing Coolify variables, preserve their values and runtime-only
flags. Do not generate new secrets or reconnect accounts just for this rename.

1. Verify the current database already includes the multiple-choice upgrade above.
   The bot release adds `20260920180839_AddTwitchQuizIntegration`; this migration
   only creates delivery, OAuth and receipt tables. If an older destructive
   upgrade is still pending, stop and use its separate maintenance procedure.
2. Confirm a recent restorable backup and the persistent `/var/lib/deadmans/keys`
   mount. Keep `DataProtection__KeysDirectory` unchanged; do not copy local tokens
   or local encryption keys into production.
3. Register `https://deadman.bug.community/api/integrations/twitch/oauth/callback`
   in the dedicated bot Twitch application, alongside the localhost callback.
   Do not replace the existing site-login Twitch application's settings.
4. In the existing Coolify `deadmans-app` production resource, save the
   `TwitchBot__*` variables from `.env.example` as runtime-only variables. Use the
   bot app Client ID/secret and a fresh production-only webhook secret. Keep
   `TwitchBot__Enabled=false` until the release and all required values are ready.
   Replace every secret placeholder before enabling. Coolify's Add dialog can
   also create a Preview entry: keep the preview bot disabled and never copy
   production secrets into it. Edit secret values in the Production entries only.
5. Roll out the reviewed release through the existing immutable-image pipeline.
   The migration runner/startup migration setting must apply the additive migration
   before the worker starts. Verify `/health/ready` and `X-Release-Sha`.
6. Enable the module and redeploy that same reviewed digest to load the runtime
   configuration. As a site administrator, open `/panel/game-quiz`, authorize
   GlobalMentorBot, then authorize the GlobalMentor channel owner. These interactive
   OAuth grants are stored and encrypted independently of local development.
7. Wait for all three connection indicators. Check the public webhook rejects an
   unsigned POST, and verify quiz delivery in the agreed test window. Do not run
   local and production quizzes in the same Twitch channel simultaneously.

Until the new image is deployed, bot endpoints on the old release may return 404;
saved Coolify variables alone do not activate the feature. Disabling
`TwitchBot__Enabled` and redeploying the same digest stops bot processing without
removing delivery history, grants or points. Do not downgrade the database.

See the [bot operating guide](../docs/twitch-bot.md) for explicit retry,
uncertain delivery and result recovery.

### Routine release automation

Add these values to the GitHub `production` environment:

```text
Secret: COOLIFY_TOKEN
Secret: COOLIFY_WEBHOOK
Variable: PRODUCTION_HEALTH_URL=https://deadman.bug.community/health/ready
```

The token needs permission to read the application, save its image digest, and start a deployment. The webhook must point to exactly one Coolify application.

After the first launch is verified, set `PRODUCTION_DEPLOY_ENABLED` to `true`. Every accepted commit on `main` will build and publish an immutable image, update Coolify to that digest, and wait for the new release to become healthy. Deployments are triggered by commits to `main`. Only database backups run daily.

## Rollback

If a release fails, first set `PRODUCTION_DEPLOY_ENABLED` to `false` and keep the logs. Redeploy the digest of the last healthy image. Check database migration compatibility before rolling application code back. Never downgrade or delete a production database that already contains user data.

Useful references include the Coolify guides for [firewalls and Docker](https://coolify.io/docs/knowledge-base/server/firewall) and [PostgreSQL TLS](https://coolify.io/docs/databases/ssl).
