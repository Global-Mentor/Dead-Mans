import http from "node:http";
import { pathToFileURL } from "node:url";

const listenHost = "0.0.0.0";
const listenPort = Number(process.env.TWITCH_WEBHOOK_PROXY_PORT ?? 5290);
const maxBodyBytes = 256 * 1024;
const webhookPath = "/api/integrations/twitch/eventsub";
const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function copyHeaders(headers) {
  const excluded = new Set([
    ...hopByHopHeaders,
    ...(headers.connection ?? "")
      .toLowerCase()
      .split(",")
      .map((name) => name.trim()),
  ]);
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([name, value]) =>
        value !== undefined && !excluded.has(name.toLowerCase()),
    ),
  );
}

export function createWebhookProxy(backendPort = 5285) {
  const server = http.createServer(async (request, response) => {
    if (request.url !== webhookPath) {
      response.writeHead(404).end();
      return;
    }

    if (request.method !== "POST") {
      response.writeHead(405, { Allow: "POST" }).end();
      return;
    }

    const chunks = [];
    let length = 0;
    try {
      for await (const chunk of request) {
        length += chunk.length;
        if (length > maxBodyBytes) {
          response.writeHead(413, { Connection: "close" }).end();
          return;
        }
        chunks.push(chunk);
      }
    } catch {
      if (!response.headersSent) response.writeHead(400);
      response.end();
      return;
    }
    const headers = copyHeaders(request.headers);
    headers.host = `localhost:${backendPort}`;
    headers["content-length"] = String(length);
    delete headers["x-forwarded-for"];
    delete headers["x-forwarded-host"];
    headers["x-forwarded-proto"] = "https";

    const upstream = http.request(
      {
        hostname: "127.0.0.1",
        port: backendPort,
        path: webhookPath,
        method: "POST",
        headers,
      },
      (upstreamResponse) => {
        response.writeHead(
          upstreamResponse.statusCode ?? 502,
          copyHeaders(upstreamResponse.headers),
        );
        upstreamResponse.pipe(response);
        upstreamResponse.on("error", () => response.destroy());
      },
    );

    upstream.setTimeout(15_000, () =>
      upstream.destroy(new Error("Upstream timeout")),
    );
    upstream.on("error", () => {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
    response.on("close", () => upstream.destroy());
    upstream.end(Buffer.concat(chunks));
  });

  server.requestTimeout = 20_000;
  server.headersTimeout = 10_000;
  return server;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = createWebhookProxy();
  server.listen(listenPort, listenHost, () => {
    console.log(
      `Twitch webhook proxy listening on ${listenHost}:${listenPort}`,
    );
  });

  function shutdown() {
    server.close(() => process.exit(0));
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
