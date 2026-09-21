import { createHmac, randomUUID } from "node:crypto";
import { createServer } from "node:http";

const port = Number(process.env.FAKE_TWITCH_PORT ?? 8099);
const webhookUrl =
  process.env.FAKE_TWITCH_WEBHOOK_URL ??
  "http://localhost:5285/api/integrations/twitch/eventsub";
const webhookSecret =
  process.env.FAKE_TWITCH_WEBHOOK_SECRET ?? "deadmans-local-eventsub-secret";
const botId = process.env.FAKE_TWITCH_BOT_ID ?? "100001";
const broadcasterId = process.env.FAKE_TWITCH_BROADCASTER_ID ?? "200001";
const codes = new Map();
const subscriptions = [];

const json = (response, status, value) => {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
};

const identityFor = (accessToken) => {
  const isBroadcaster = accessToken.includes("broadcaster");
  return isBroadcaster
    ? {
        id: broadcasterId,
        login: "local_broadcaster",
        display_name: "Local Broadcaster",
      }
    : { id: botId, login: "local_quiz_bot", display_name: "Local Quiz Bot" };
};

const emitEvent = async (
  payload,
  fixedId,
  messageType = "notification",
  targetUrl = webhookUrl,
) => {
  const notificationId = fixedId ?? randomUUID();
  const timestamp = new Date().toISOString();
  const raw = Buffer.from(JSON.stringify(payload));
  const signature = `sha256=${createHmac("sha256", webhookSecret)
    .update(notificationId + timestamp)
    .update(raw)
    .digest("hex")}`;
  return fetch(targetUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Twitch-Eventsub-Message-Id": notificationId,
      "Twitch-Eventsub-Message-Timestamp": timestamp,
      "Twitch-Eventsub-Message-Signature": signature,
      "Twitch-Eventsub-Message-Type": messageType,
    },
    body: raw,
  });
};

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  if (request.method === "GET" && url.pathname === "/oauth2/authorize") {
    const callback = new URL(url.searchParams.get("redirect_uri"));
    const scopes = url.searchParams.get("scope") ?? "";
    const role = scopes.includes("channel:bot") ? "broadcaster" : "bot";
    const code = `${role}-${randomUUID()}`;
    codes.set(code, { role, scopes: scopes.split(" ").filter(Boolean) });
    callback.searchParams.set("code", code);
    callback.searchParams.set("state", url.searchParams.get("state") ?? "");
    response.writeHead(302, { location: callback.toString() });
    response.end();
    return;
  }

  if (request.method === "POST" && url.pathname === "/oauth2/token") {
    const form = new URLSearchParams(
      (await readBody(request)).toString("utf8"),
    );
    if (form.get("grant_type") === "client_credentials") {
      json(response, 200, {
        access_token: "app-local",
        expires_in: 3600,
        token_type: "bearer",
      });
      return;
    }
    const code = form.get("code");
    const role = code
      ? codes.get(code)?.role
      : form.get("refresh_token")?.includes("broadcaster")
        ? "broadcaster"
        : "bot";
    const scopes = code
      ? codes.get(code)?.scopes
      : role === "broadcaster"
        ? ["channel:bot"]
        : ["user:read:chat", "user:write:chat", "user:bot"];
    json(response, 200, {
      access_token: `${role}-access-${randomUUID()}`,
      refresh_token: `${role}-refresh-${randomUUID()}`,
      expires_in: 3600,
      scope: scopes,
      token_type: "bearer",
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/oauth2/validate") {
    const identity = identityFor(request.headers.authorization ?? "");
    json(response, 200, {
      client_id: process.env.FAKE_TWITCH_CLIENT_ID ?? "local-client",
      user_id: identity.id,
      expires_in: 3600,
      scopes:
        identity.id === broadcasterId
          ? ["channel:bot"]
          : ["user:read:chat", "user:write:chat", "user:bot"],
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/helix/users") {
    json(response, 200, {
      data: [identityFor(request.headers.authorization ?? "")],
    });
    return;
  }

  if (
    request.method === "POST" &&
    url.pathname === "/helix/eventsub/subscriptions"
  ) {
    const input = JSON.parse((await readBody(request)).toString("utf8"));
    const challenge = randomUUID();
    const subscription = {
      id: randomUUID(),
      type: input.type,
      status: "webhook_callback_verification_pending",
      condition: input.condition,
      transport: { callback: input.transport.callback },
    };
    try {
      const verification = await emitEvent(
        { challenge, subscription },
        undefined,
        "webhook_callback_verification",
        input.transport.callback,
      );
      if ((await verification.text()) === challenge) {
        subscription.status = "enabled";
        subscriptions.splice(0, subscriptions.length, subscription);
      }
    } catch {
      // Keep the pending status so the backend can retry creation once its webhook is reachable.
    }
    json(response, 202, {
      data: [subscription],
    });
    return;
  }
  if (
    request.method === "GET" &&
    url.pathname === "/helix/eventsub/subscriptions"
  ) {
    json(response, 200, { data: subscriptions });
    return;
  }

  if (request.method === "POST" && url.pathname === "/helix/chat/messages") {
    const body = JSON.parse((await readBody(request)).toString("utf8"));
    const mode =
      request.headers["x-fake-send-mode"] ??
      process.env.FAKE_TWITCH_SEND_MODE ??
      "sent";
    if (mode === "429") {
      response.writeHead(429, {
        "Ratelimit-Reset": String(Math.floor(Date.now() / 1000) + 2),
      });
      response.end();
      return;
    }
    if (mode === "timeout") return;
    json(response, 200, {
      data: [
        {
          message_id: randomUUID(),
          is_sent: mode !== "not-sent",
          drop_reason:
            mode === "not-sent"
              ? {
                  code: "fake_drop",
                  message: "Fake Twitch rejected the message.",
                }
              : null,
          echoed_message: body.message,
        },
      ],
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/emit") {
    const input = JSON.parse((await readBody(request)).toString("utf8"));
    const payload = {
      subscription: {
        type: "channel.chat.message",
        status: "enabled",
        condition: { broadcaster_user_id: broadcasterId, user_id: botId },
      },
      event: {
        broadcaster_user_id: input.broadcasterUserId ?? broadcasterId,
        chatter_user_id: input.chatterUserId ?? "300001",
        chatter_user_login: input.login ?? "local_viewer",
        chatter_user_name: input.displayName ?? "Local Viewer",
        message_id: input.messageId ?? randomUUID(),
        message: { text: input.text ?? "!1" },
        ...(input.sourceBroadcasterUserId
          ? { source_broadcaster_user_id: input.sourceBroadcasterUserId }
          : {}),
      },
    };
    const result = await emitEvent(payload, input.notificationId);
    json(response, result.status, { webhookStatus: result.status });
    return;
  }

  json(response, 404, { error: "not_found" });
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`Fake Twitch listening on http://127.0.0.1:${port}\n`);
});
