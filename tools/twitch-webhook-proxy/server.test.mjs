import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createWebhookProxy } from "./server.mjs";

const path = "/api/integrations/twitch/eventsub";
const listen = (server) =>
  new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server.address().port)),
  );

test("proxy forwards exact raw body and signature, blocks other paths and methods", async (t) => {
  let requests = 0;
  const upstream = createServer(async (req, res) => {
    requests++;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString(), '{ "challenge": "hello" }');
    assert.equal(
      req.headers["twitch-eventsub-message-signature"],
      "sha256=test",
    );
    assert.match(req.headers.host, /^localhost:/);
    res.writeHead(200, { "content-type": "text/plain" }).end("hello");
  });
  const proxy = createWebhookProxy(await listen(upstream));
  const origin = `http://127.0.0.1:${await listen(proxy)}`;
  t.after(() => {
    proxy.closeAllConnections();
    proxy.close();
    upstream.closeAllConnections();
    upstream.close();
  });
  for (const route of [
    "/",
    "/api/integrations/twitch/oauth/callback",
    `${path}?other=1`,
  ]) {
    assert.equal((await fetch(origin + route)).status, 404);
  }
  assert.equal((await fetch(origin + path)).status, 405);
  const response = await fetch(origin + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "twitch-eventsub-message-signature": "sha256=test",
    },
    body: '{ "challenge": "hello" }',
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "hello");
  const tooLarge = await fetch(origin + path, {
    method: "POST",
    body: "x".repeat(256 * 1024 + 1),
  });
  assert.equal(tooLarge.status, 413);
  assert.equal(requests, 1);
});
