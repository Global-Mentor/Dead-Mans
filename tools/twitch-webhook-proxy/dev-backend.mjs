import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import concurrently from "concurrently";
import { parse } from "jsonc-parser";

const projectRoot = resolve(import.meta.dirname, "../..");
const execFileAsync = promisify(execFile);
const containerName = "deadmans-twitch-quiz-tunnel";
const tunnelImage =
  "cloudflare/cloudflared@sha256:b269e8abd07a5bf6f3f4be65d5050b2174eca89c56a0241a8ff32a16aec454e4";
const upstream = "http://host.docker.internal:5290";

function flatten(value, settings, prefix = "") {
  for (const [name, item] of Object.entries(value)) {
    const key = prefix ? `${prefix}:${name}` : name;
    if (item !== null && typeof item === "object" && !Array.isArray(item)) {
      flatten(item, settings, key);
    } else settings.set(key.toLowerCase(), item);
  }
}

export async function readTwitchSettings(
  root = projectRoot,
  env = process.env,
) {
  const project = await readFile(
    resolve(root, "backend/backend.csproj"),
    "utf8",
  );
  const secretId = project.match(
    /<UserSecretsId>([^<]+)<\/UserSecretsId>/,
  )?.[1];
  const secretRoot = env.APPDATA
    ? resolve(env.APPDATA, "Microsoft/UserSecrets")
    : resolve(homedir(), ".microsoft/usersecrets");
  // The HTTP launch profile sets ASPNETCORE_ENVIRONMENT; DOTNET_ENVIRONMENT wins.
  const environment = env.DOTNET_ENVIRONMENT ?? "Development";
  const isDevelopment = environment.toLowerCase() === "development";
  const files = [
    resolve(root, "backend/appsettings.json"),
    resolve(root, `backend/appsettings.${environment}.json`),
    ...(isDevelopment && secretId
      ? [resolve(secretRoot, secretId, "secrets.json")]
      : []),
    ...(isDevelopment ? [resolve(root, "backend/appsettings.Local.json")] : []),
  ];
  const settings = new Map();
  for (const file of files) {
    try {
      const errors = [];
      const value = parse(
        (await readFile(file, "utf8")).replace(/^\uFEFF/, ""),
        errors,
        { allowTrailingComma: true },
      );
      if (
        errors.length ||
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
      ) {
        throw new Error("Invalid configuration object.");
      }
      flatten(value, settings);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw new Error(
          `Cannot read startup settings from ${file}. Check JSON syntax and file access.`,
        );
      }
    }
  }
  for (const [key, value] of Object.entries(env)) {
    settings.set(key.replaceAll("__", ":").toLowerCase(), value);
  }
  const setting = (name) => {
    const key = `twitchbot:${name}`;
    return settings.has(key)
      ? settings.get(key)
      : settings.get(`twitchquiz:${name}`);
  };
  return {
    enabled: String(setting("enabled")).trim().toLowerCase() === "true",
    callback: String(setting("webhookcallbackurl") ?? ""),
  };
}

export function isQuickTunnelCallback(callback) {
  try {
    const url = new URL(callback);
    return (
      url.protocol === "https:" && url.hostname.endsWith(".trycloudflare.com")
    );
  } catch {
    return false;
  }
}

export function quickTunnelUrl(log, startedAt) {
  // Only creation banners contain the current address; request logs may name old URLs.
  return log
    .split(/\r?\n/)
    .filter((line) => Date.parse(line.split(" ")[0]) >= Date.parse(startedAt))
    .map(
      (line) =>
        line.match(/\|\s*(https:\/\/[a-z0-9-]+\.trycloudflare\.com)\s*\|/)?.[1],
    )
    .filter(Boolean)
    .at(-1);
}

async function docker(args) {
  return execFileAsync("docker", args, {
    cwd: projectRoot,
    windowsHide: true,
    timeout: 120_000,
    maxBuffer: 1024 * 1024,
  });
}

export async function ensureQuickTunnel(run = docker) {
  const inspect = async () => {
    try {
      const result = await run(["inspect", containerName]);
      return JSON.parse(result.stdout)[0];
    } catch (error) {
      if (/No such (object|container)/i.test(error.stderr ?? "")) return null;
      throw error;
    }
  };
  let container = await inspect();
  if (!container) {
    await run([
      "run",
      "-d",
      "--name",
      containerName,
      "--restart",
      "unless-stopped",
      "--add-host",
      "host.docker.internal:host-gateway",
      tunnelImage,
      "tunnel",
      "--no-autoupdate",
      "--url",
      upstream,
    ]);
  } else {
    const command = container.Config.Cmd ?? [];
    if (
      !container.Config.Image.startsWith("cloudflare/cloudflared:") &&
      !container.Config.Image.startsWith("cloudflare/cloudflared@")
    ) {
      throw new Error(`${containerName} is not the local Cloudflare tunnel.`);
    }
    if (
      !command.includes("--url") ||
      command[command.indexOf("--url") + 1] !== upstream
    ) {
      throw new Error(`${containerName} must forward only to ${upstream}.`);
    }
    if (!container.State.Running) await run(["start", containerName]);
  }
  container = await inspect();
  let startedAt = container?.State.StartedAt;
  if (!container?.State.Running || !Number.isFinite(Date.parse(startedAt))) {
    throw new Error("The local Twitch tunnel did not start.");
  }
  for (let attempt = 0; attempt < 45; attempt++) {
    const result = await run([
      "logs",
      "--timestamps",
      "--tail",
      "100",
      containerName,
    ]);
    const url = quickTunnelUrl(`${result.stdout}\n${result.stderr}`, startedAt);
    if (url) return `${url}/api/integrations/twitch/eventsub`;
    // A rotated startup banner cannot identify the current callback safely.
    if (attempt === 0 && Date.now() - Date.parse(startedAt) > 120_000) {
      await run(["restart", containerName]);
      container = await inspect();
      startedAt = container?.State.StartedAt;
      if (
        !container?.State.Running ||
        !Number.isFinite(Date.parse(startedAt))
      ) {
        throw new Error("The local Twitch tunnel did not restart.");
      }
    }
    await new Promise((done) => setTimeout(done, 1000));
  }
  throw new Error(
    "Cloudflare did not provide a local Twitch webhook URL within 45 seconds.",
  );
}

export async function startBackend({
  root = projectRoot,
  env = process.env,
  tunnel = ensureQuickTunnel,
  run = concurrently,
  log = console.log,
} = {}) {
  const settings = await readTwitchSettings(root, env);
  const apiEnv = { ...env };
  if (settings.enabled && isQuickTunnelCallback(settings.callback)) {
    apiEnv.TwitchBot__WebhookCallbackUrl = await tunnel();
    log(`Local Twitch webhook: ${apiEnv.TwitchBot__WebhookCallbackUrl}`);
  }
  const commands = [
    {
      command: "dotnet run --project backend/backend.csproj",
      name: "api",
      env: apiEnv,
    },
  ];
  if (settings.enabled) {
    commands.push({
      command: "npm run dev:twitch-proxy",
      name: "eventsub",
      env: { ...env, TWITCH_WEBHOOK_PROXY_PORT: "5290" },
    });
  }
  const { result } = run(commands, {
    cwd: root,
    killOthersOn: ["success", "failure"],
    prefixColors: ["blue", "magenta"],
    killTimeout: 5000,
  });
  await result;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startBackend().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Local backend services stopped.",
    );
    process.exitCode = 1;
  });
}
