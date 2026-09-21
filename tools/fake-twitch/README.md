# Fake Twitch stand

Run from the repository root:

```powershell
npm run fake:twitch
```

Configure the backend with `TwitchQuiz` values from `docs/twitch-quiz-bot.md`, authorize both local identities in the quiz panel, then emit a signed chat message:

```powershell
Invoke-RestMethod -Method Post -ContentType application/json `
  -Uri http://localhost:8099/emit `
  -Body '{"text":"!1","chatterUserId":"300001","login":"viewer","displayName":"Viewer"}'
```

Set `FAKE_TWITCH_SEND_MODE` to `sent`, `not-sent`, `429`, or `timeout` before starting the stand. Reuse `notificationId` or `messageId` in `/emit` to verify replay handling.
