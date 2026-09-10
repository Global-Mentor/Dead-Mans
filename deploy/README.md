# Deploying with Coolify

This guide describes the current Dead Mans production setup. One VPS runs Coolify, the application, PostgreSQL, and SeaweedFS. SeaweedFS provides S3 compatible storage for images.

## What you need

1. A 64 bit x86 VPS running Ubuntu 24.04 LTS or another supported Linux release.
2. A public IPv4 address and access to the domain DNS settings.
3. A Twitch application with its client ID and secret.

Install Coolify by following its [installation guide](https://coolify.io/docs/get-started/installation). Keep SSH, HTTP, and HTTPS reachable. The temporary Coolify setup ports can be closed after the panel has its own HTTPS hostname and remote access has been tested.

## DNS

Create `A` records for the root domain, `deadman`, `media`, and `ops`. Point all four records to the VPS. Remove parking records that conflict with them. A wildcard record is not needed.

The public addresses are:

```text
https://deadman.bug.community
https://bug.community
https://media.bug.community
https://ops.bug.community
```

The root domain redirects to `deadman.bug.community`. `media.bug.community` serves image objects. `ops.bug.community` is the Coolify control panel and requires a Coolify account.

## PostgreSQL

Create a PostgreSQL 16 service in Coolify with a persistent volume and no public port. Start with a new empty database and enable TLS.

The connection string must use `SSL Mode=VerifyFull` and a trusted CA certificate. Replace `postgres.internal` in [`deploy/.env.example`](.env.example) with the real internal database hostname covered by that certificate.

The detailed first database rollout is documented in [`docs/runbooks/initial-production-database-rollout.md`](../docs/runbooks/initial-production-database-rollout.md).

## Image storage

Run SeaweedFS as a private Coolify service with persistent volumes. Create the `deadmans-media` bucket and publish only its S3 endpoint through `https://media.bug.community`.

The application account needs read, list, tagging, and write access to this bucket. Anonymous users may read individual objects, but anonymous listing and writing must remain disabled. Keep the SeaweedFS admin interface private.

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
2. The SeaweedFS endpoint, bucket, and application credentials.
3. The Twitch client ID, secret, and callback addresses.
4. The trusted CIDR of the actual Coolify proxy network.

Mount a persistent volume at `/var/lib/deadmans/keys` and make it writable by the application user. Mount the PostgreSQL CA certificate at `/run/secrets/postgres-ca.crt` with read permission only. Never store production secrets in this repository.

The Coolify healthcheck runs inside the application container. It calls `/health/ready` through `127.0.0.1:8080` and sends `Host: deadman.bug.community`.

## Backups

Run `/usr/local/sbin/deadmans-backup` on the VPS when you need a backup. It creates a restricted archive in `/var/backups/deadmans` containing the PostgreSQL dump, SeaweedFS data, SeaweedFS configuration, and ASP.NET data protection keys.

Check the archive with its included `SHA256SUMS` file and test the database dump in a separate database. Copy important archives away from the VPS manually. A backup kept only on the same VPS will be lost if the server is lost.

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

Add these values to the GitHub `production` environment:

```text
Secret: COOLIFY_TOKEN
Secret: COOLIFY_WEBHOOK
Variable: PRODUCTION_HEALTH_URL=https://deadman.bug.community/health/ready
```

The token needs permission to read the application, save its image digest, and start a deployment. The webhook must point to exactly one Coolify application.

After the first launch is verified, set `PRODUCTION_DEPLOY_ENABLED` to `true`. Every accepted commit on `main` builds and publishes an immutable image, updates Coolify to that digest, and waits for the new release to become healthy. Backups remain manual until offsite storage is configured.

## Rollback

If a release fails, first set `PRODUCTION_DEPLOY_ENABLED` to `false` and keep the logs. Redeploy the digest of the last healthy image. Check database migration compatibility before rolling application code back. Never downgrade or delete a production database that already contains user data.

Useful references include the Coolify guides for [firewalls and Docker](https://coolify.io/docs/knowledge-base/server/firewall) and [PostgreSQL TLS](https://coolify.io/docs/databases/ssl).
