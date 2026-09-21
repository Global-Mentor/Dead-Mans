# Twitch quiz bot

The module is disabled by default and does not reuse Streamer.bot credentials. It uses a dedicated Twitch application Client ID/secret, a bot user grant, and a channel-owner grant. Site sign-in remains `openid` only.

Use one dedicated Twitch Developer Application for the quiz bot in both local and production environments. Register both OAuth redirect URLs on that application: `http://localhost:5285/api/integrations/twitch/oauth/callback` and the production HTTPS equivalent. Keep the existing site-login Twitch application separate. The EventSub webhook URL is not registered in the Developer Console; the backend supplies the environment-specific callback when creating the subscription.

## Configuration

Persist the ASP.NET Core Data Protection key ring (`DataProtection__KeysDirectory`) before connecting accounts. OAuth refresh tokens are protected with this key ring; losing it requires reconnecting both Twitch accounts.

Set these environment variables:

```text
TwitchQuiz__Enabled=true
TwitchQuiz__ClientId=<dedicated app client id>
TwitchQuiz__ClientSecret=<dedicated app secret>
TwitchQuiz__WebhookSecret=<random 20-100 character secret>
TwitchQuiz__WebhookCallbackUrl=https://example.test/api/integrations/twitch/eventsub
TwitchQuiz__OAuthCallbackUrl=https://example.test/api/integrations/twitch/oauth/callback
TwitchQuiz__FrontendRedirectUrl=https://example.test/panel/game-quiz
TwitchQuiz__ExpectedBotUserId=<numeric bot Twitch id>
TwitchQuiz__ExpectedBroadcasterUserId=<numeric channel-owner Twitch id>
```

The administrator connects the bot account with `user:read:chat`, `user:write:chat`, and `user:bot`, then connects the channel owner with `channel:bot`. The callback verifies the exact expected Twitch user ID and required scopes. Application access tokens use client credentials. User-token refresh is serialized. On startup and during subscription health checks (every five minutes when connected), the worker validates user tokens, application ID, user ID and scopes with Twitch. Revoked grants require reconnecting; a temporary Twitch outage does not revoke a grant.

`OAuthBaseUrl` and `ApiBaseUrl` are origins only: `https://id.twitch.tv` and `https://api.twitch.tv`. Do not append `/oauth2` or `/helix`; the client supplies these paths. Chat messages use an application token with `for_source_only=true`, so they stay in the configured source channel. Application tokens are cached until shortly before expiry and invalidated on HTTP 401.

Sharing the OAuth application does not share runtime state. Local and production need separate databases, encryption keys, webhook URLs and secrets. Do not run live quizzes in both environments against the same channel at once: the Twitch chat and its answers are shared even though the databases are separate. Use a separate test channel for simultaneous testing.

Twitch must reach the HTTPS webhook URL. Configure the reverse proxy to preserve the raw request body. The endpoint verifies Twitch HMAC over the original bytes, rejects timestamps outside ten minutes, validates the subscription/channel, ignores Shared Chat messages from another source channel, and deduplicates notification and chat message IDs.

## Local fake stand

Start PostgreSQL/MinIO and apply migrations with `setup-local.bat`. Start `npm run fake:twitch`, then use:

```text
TwitchQuiz__Enabled=true
TwitchQuiz__ClientId=local-client
TwitchQuiz__ClientSecret=local-client-secret
TwitchQuiz__WebhookSecret=deadmans-local-eventsub-secret
TwitchQuiz__WebhookCallbackUrl=http://localhost:5285/api/integrations/twitch/eventsub
TwitchQuiz__OAuthCallbackUrl=http://localhost:5285/api/integrations/twitch/oauth/callback
TwitchQuiz__FrontendRedirectUrl=http://localhost:5180/panel/game-quiz
TwitchQuiz__ExpectedBotUserId=100001
TwitchQuiz__ExpectedBroadcasterUserId=200001
TwitchQuiz__OAuthBaseUrl=http://localhost:8099
TwitchQuiz__ApiBaseUrl=http://localhost:8099
```

The stand supports successful delivery, `is_sent=false`, HTTP 429, timeout/unknown delivery, signed messages, repeated IDs, foreign channels, and Shared Chat source IDs. See `tools/fake-twitch/README.md`.

## Local real-channel testing

1. Keep credentials in the ignored `backend/appsettings.Local.json` or .NET user secrets, never in tracked configuration. Use the localhost OAuth callback and frontend URLs from the fake stand, but the real Twitch origins and numeric account IDs.
2. Start the application with `npm run dev`, then start `npm run dev:twitch-proxy` in a second terminal. The proxy listens on port 5290 and exposes only `POST /api/integrations/twitch/eventsub`, limits bodies to 256 KiB, and preserves the exact bytes used for signature verification. Other paths, query variants and methods are blocked. It binds all interfaces so a Docker tunnel can reach it; stop it when testing is finished.
3. Point the HTTPS tunnel at port 5290, not the full API on port 5285. For a tunnel running inside Docker on Windows, the upstream is `http://host.docker.internal:5290`.
4. Set `TwitchQuiz:WebhookCallbackUrl` to the tunnel HTTPS URL plus `/api/integrations/twitch/eventsub`, then restart the backend. A temporary tunnel URL can change after restarting the tunnel; update the callback accordingly. No Twitch Developer Console edit is needed for the webhook URL.
5. Open `/panel/game-quiz`, connect the two accounts if needed, and wait until bot, channel and EventSub are all connected. Existing encrypted grants survive normal application restarts.
6. Run the acceptance scenario below. For production use a stable HTTPS domain, persisted Data Protection keys and production secrets, not this development proxy or temporary tunnel.

Run `npm run test:twitch-proxy` and `npm run check:text-style` to verify the local proxy and the no-long-dash text rule. Both checks also run in CI.

## Operating rules

- Exclude `!1` through `!10` from every Streamer.bot action so the same Twitch account does not react twice.
- A question is reserved and published as two sequential messages. The site and chat remain closed during “Publishing question”. The server starts the timer and creates the shared question session only after Twitch returns `is_sent=true` for the options message.
- A failed confirmed delivery can be retried. A timeout is “delivery uncertain” and is never retried automatically; the explicit retry may produce a duplicate in Twitch.
- Confirmed steps and the shuffled option order survive restarts. Do not delete publication rows manually.
- Publication workers and recovery actions share a PostgreSQL advisory lock. The `sending` marker is committed before calling Twitch; a crash during any delivery, including a result, is recovered as uncertain and needs explicit operator action.
- Points settle once through the normal quiz closure transaction. Result delivery is separate; retrying it cannot repeat rewards. Resolve or explicitly skip an old result before the next question.
- Ending a game cancels unpublished preparation. A partially published or skipped question gets one cancellation message when delivery is available.
- Only standalone `!1`…`!10` messages are accepted. Invalid messages are neither saved nor charged as attempts. The first accepted site/chat choice wins for `(question session, user)`.

Messages use compact whitespace and ASCII hyphens. Options are formatted as `!1 [3] | !2 [4] | На ответ: 30 секунд. Одна попытка.`; the result repeats the command and bracketed answer. Compatibility validation includes the brackets and result text in the Twitch 500-character limit.

API references: [Send Chat Message](https://dev.twitch.tv/docs/api/reference/#send-chat-message), [handling signed EventSub webhooks](https://dev.twitch.tv/docs/eventsub/handling-webhook-events/).

## Real-channel acceptance scenario

Use a test Twitch application, bot account, and test channel. Do not connect production automatically.

1. Persist the encryption key directory, configure expected IDs, expose HTTPS, and connect both accounts from an administrator session.
2. Confirm the panel shows both grants and EventSub recovery succeeds after a backend restart.
3. Start a question while Streamer.bot is online with `!1`…`!10` excluded. Verify exactly the normal three messages without manual retries.
4. Answer simultaneously from the site and chat with the same Twitch identity. Verify one attempt and one reward.
5. Exercise invalid choices, changed choices, the exact deadline, a repeated signed event, a foreign channel, and Shared Chat.
6. Force `is_sent=false`, 429, and a timeout. Verify partial resume, explicit uncertain retry warning, cancellation, and restart recovery.
7. Fail only the result message. Verify rewards remain settled once and the next question is blocked until retry or “skip result”.
8. Revoke each OAuth grant and confirm the site reports the loss of access and reconnects cleanly.

This repository does not perform the real Twitch acceptance run, production deployment, channel connection, or Streamer.bot modification automatically.
