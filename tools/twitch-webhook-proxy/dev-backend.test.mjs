import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Writable } from "node:stream";
import concurrently from "concurrently";
import {
  ensureQuickTunnel,
  isQuickTunnelCallback,
  quickTunnelUrl,
  readTwitchSettings,
  startBackend,
} from "./dev-backend.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "deadmans-eventsub-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "backend"));
  await writeFile(join(root, "backend/backend.csproj"), "<Project />");
  return root;
}

test("JSONC configuration follows the API's file and environment precedence", async (t) => {
  const root = await fixture(t);
  const secretDir = join(root, "Microsoft/UserSecrets/test-startup");
  await mkdir(secretDir, { recursive: true });
  await writeFile(
    join(root, "backend/backend.csproj"),
    "<Project><UserSecretsId>test-startup</UserSecretsId></Project>",
  );
  const layers = [
    ["backend/appsettings.json", "base"],
    ["backend/appsettings.Development.json", "development"],
    ["Microsoft/UserSecrets/test-startup/secrets.json", "secret"],
    ["backend/appsettings.Local.json", "local"],
  ];
  for (const [path, name] of layers) {
    await writeFile(
      join(root, path),
      `\uFEFF{
      // JSONC is accepted by .NET configuration.
      "TwitchBot:Enabled": " true ",
      "twitchbot:WebhookCallbackUrl": "https://${name}.example.test/callback",
    }`,
    );
    assert.deepEqual(await readTwitchSettings(root, { APPDATA: root }), {
      enabled: true,
      callback: `https://${name}.example.test/callback`,
    });
  }
  assert.deepEqual(
    await readTwitchSettings(root, {
      APPDATA: root,
      TwitchBot__Enabled: "false",
      TwitchBot__WebhookCallbackUrl:
        "https://environment.example.test/callback",
    }),
    { enabled: false, callback: "https://environment.example.test/callback" },
  );
  await writeFile(
    join(root, "backend/appsettings.Testing.json"),
    '{"TwitchBot":{"Enabled":false}}',
  );
  assert.deepEqual(
    await readTwitchSettings(root, {
      APPDATA: root,
      DOTNET_ENVIRONMENT: "Testing",
    }),
    {
      enabled: false,
      callback: "https://base.example.test/callback",
    },
  );
});

test("startup leaves disabled and custom-domain setups alone and applies the managed callback only to the API", async (t) => {
  const root = await fixture(t);
  for (const [enabled, callback] of [
    ["false", "https://old.trycloudflare.com/callback"],
    ["true", "https://custom.example.test/callback"],
    ["true", "https://old.trycloudflare.com/callback"],
  ]) {
    const env = {
      TwitchBot__Enabled: enabled,
      TwitchBot__WebhookCallbackUrl: callback,
      TWITCH_WEBHOOK_PROXY_PORT: "9000",
    };
    let tunnels = 0;
    let commands;
    await startBackend({
      root,
      env,
      log: () => {},
      tunnel: async () => {
        tunnels++;
        return "https://fresh.trycloudflare.com/api/integrations/twitch/eventsub";
      },
      run: (input) => {
        commands = input;
        return { result: Promise.resolve() };
      },
    });
    const managed = enabled === "true" && callback.includes("trycloudflare");
    assert.equal(tunnels, managed ? 1 : 0);
    assert.equal(commands.length, enabled === "true" ? 2 : 1);
    assert.equal(
      commands[0].env.TwitchBot__WebhookCallbackUrl,
      managed
        ? "https://fresh.trycloudflare.com/api/integrations/twitch/eventsub"
        : callback,
    );
    if (enabled === "true") {
      assert.equal(commands[1].env.TWITCH_WEBHOOK_PROXY_PORT, "5290");
      assert.equal(commands[1].env.TwitchBot__WebhookCallbackUrl, callback);
    }
    assert.equal(env.TwitchBot__WebhookCallbackUrl, callback);
    assert.equal(env.TWITCH_WEBHOOK_PROXY_PORT, "9000");
  }
});

test("a tunnel startup failure does not leave API or proxy processes behind", async (t) => {
  const root = await fixture(t);
  await assert.rejects(
    startBackend({
      root,
      env: {
        TwitchBot__Enabled: "true",
        TwitchBot__WebhookCallbackUrl: "https://old.trycloudflare.com",
      },
      tunnel: async () => {
        throw new Error("Docker unavailable");
      },
      run: () => assert.fail("services must not start with a stale callback"),
    }),
    /Docker unavailable/,
  );
});

test(
  "API exit and proxy failure stop the companion process",
  { timeout: 20_000 },
  async (t) => {
    const root = await fixture(t);
    for (const [exiting, code] of [
      ["api", 0],
      ["eventsub", 17],
    ]) {
      for (const name of ["api", "eventsub"]) {
        const peer = name === "api" ? "eventsub" : "api";
        await writeFile(
          join(root, `${name}.mjs`),
          `
        import { writeFileSync, existsSync } from 'node:fs';
        import { setTimeout } from 'node:timers/promises';
        writeFileSync('${exiting}-${name}.pid', String(process.pid));
        ${
          name === exiting
            ? `
          while (!existsSync('${exiting}-${peer}.pid')) await setTimeout(20);
          process.exit(${code});
        `
            : "setInterval(() => {}, 1000);"
        }
      `,
        );
      }
      let group;
      t.after(async () => {
        for (const command of group?.commands ?? []) command.kill();
        await group?.result.catch(() => {});
      });
      await assert.rejects(
        startBackend({
          root,
          env: { TwitchBot__Enabled: "true" },
          run: (commands, options) => {
            group = concurrently(
              commands.map((command) => ({
                ...command,
                command: `"${process.execPath}" ${command.name}.mjs`,
              })),
              {
                ...options,
                outputStream: new Writable({
                  write: (_chunk, _encoding, done) => done(),
                }),
              },
            );
            return group;
          },
        }),
        (events) => {
          assert.equal(events.length, 2);
          assert.equal(
            events.find((event) => event.command.name === exiting).exitCode,
            code,
          );
          return true;
        },
      );
      const peer = exiting === "api" ? "eventsub" : "api";
      const pid = Number(
        await readFile(join(root, `${exiting}-${peer}.pid`), "utf8"),
      );
      assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
    }
  },
);

test("startup honors local settings, environment overrides and explicit canonical disable", async (t) => {
  const root = await fixture(t);
  await writeFile(
    join(root, "backend/appsettings.Local.json"),
    JSON.stringify({
      TwitchQuiz: {
        Enabled: true,
        WebhookCallbackUrl:
          "https://legacy.trycloudflare.com/api/integrations/twitch/eventsub",
      },
      TwitchBot: {
        WebhookCallbackUrl:
          "https://local.trycloudflare.com/api/integrations/twitch/eventsub",
      },
    }),
  );
  assert.deepEqual(await readTwitchSettings(root, {}), {
    enabled: true,
    callback:
      "https://local.trycloudflare.com/api/integrations/twitch/eventsub",
  });
  assert.deepEqual(
    await readTwitchSettings(root, {
      TwitchBot__Enabled: "false",
      TwitchBot__WebhookCallbackUrl: "",
    }),
    { enabled: false, callback: "" },
  );
  await writeFile(
    join(root, "backend/appsettings.Local.json"),
    '{"ClientSecret": "do-not-print" broken}',
  );
  await assert.rejects(readTwitchSettings(root, {}), (error) => {
    assert.match(error.message, /Cannot read startup settings/);
    assert.doesNotMatch(error.message, /do-not-print/);
    return true;
  });
});

test("a fresh installation leaves the bot disabled", async (t) => {
  const root = await fixture(t);
  assert.deepEqual(await readTwitchSettings(root, {}), {
    enabled: false,
    callback: "",
  });
});

test("only configured HTTPS quick tunnels are managed automatically", () => {
  assert.equal(
    isQuickTunnelCallback(
      "https://local.trycloudflare.com/api/integrations/twitch/eventsub",
    ),
    true,
  );
  for (const callback of [
    "",
    "http://local.trycloudflare.com",
    "https://example.com",
    "https://local.trycloudflare.com.example.com",
  ]) {
    assert.equal(isQuickTunnelCallback(callback), false);
  }
  assert.equal(
    quickTunnelUrl(
      "2026-10-27T12:00:00Z | https://previous.trycloudflare.com |\n2026-10-28T12:00:01Z | https://current.trycloudflare.com |\n2026-10-28T12:00:02Z Request failed dest=https://old.trycloudflare.com/",
      "2026-10-28T12:00:00Z",
    ),
    "https://current.trycloudflare.com",
  );
});

const running = {
  Config: {
    Image: "cloudflare/cloudflared:latest",
    Cmd: ["tunnel", "--url", "http://host.docker.internal:5290"],
  },
  State: { Running: true, StartedAt: "2026-10-28T15:37:18Z" },
};

test("a running tunnel is reused and only its current startup logs select the callback", async () => {
  const calls = [];
  const callback = await ensureQuickTunnel(async (args) => {
    calls.push(args);
    return args[0] === "inspect"
      ? { stdout: JSON.stringify([running]) }
      : {
          stdout: "",
          stderr: "2026-10-28T15:37:24Z | https://fresh.trycloudflare.com |",
        };
  });
  assert.equal(
    callback,
    "https://fresh.trycloudflare.com/api/integrations/twitch/eventsub",
  );
  assert.deepEqual(calls.at(-1).slice(0, 2), ["logs", "--timestamps"]);
  assert.equal(
    calls.some(([command]) =>
      ["start", "restart", "run", "rm"].includes(command),
    ),
    false,
  );
});

test("a stopped owned tunnel is started before its new address is read", async () => {
  let started = false;
  await ensureQuickTunnel(async (args) => {
    if (args[0] === "start") started = true;
    if (args[0] === "inspect")
      return {
        stdout: JSON.stringify([
          { ...running, State: { ...running.State, Running: started } },
        ]),
      };
    return {
      stdout: "2026-10-28T15:37:24Z | https://restarted.trycloudflare.com |",
      stderr: "",
    };
  });
  assert.equal(started, true);
});

test("a missing tunnel is created with a pinned image and only the proxy upstream", async () => {
  let create;
  await ensureQuickTunnel(async (args) => {
    if (args[0] === "inspect" && !create)
      throw Object.assign(new Error("missing"), {
        stderr: "No such object: deadmans-twitch-quiz-tunnel",
      });
    if (args[0] === "run") create = args;
    if (args[0] === "inspect") return { stdout: JSON.stringify([running]) };
    return {
      stdout: "2026-10-28T15:37:24Z | https://new.trycloudflare.com |",
      stderr: "",
    };
  });
  assert.equal(
    create[create.indexOf("--url") + 1],
    "http://host.docker.internal:5290",
  );
  assert.equal(
    create.some((arg) =>
      /^cloudflare\/cloudflared@sha256:[a-f0-9]{64}$/.test(arg),
    ),
    true,
  );
});

test("Docker failures and an unexpected container are not hidden or replaced", async () => {
  await assert.rejects(
    ensureQuickTunnel(async () => {
      throw new Error("Docker unavailable");
    }),
    /Docker unavailable/,
  );
  for (const config of [
    { ...running.Config, Image: "unrelated:latest" },
    { ...running.Config, Cmd: ["http://host.docker.internal:5290"] },
    {
      ...running.Config,
      Cmd: ["tunnel", "--url", "http://host.docker.internal:5285"],
    },
  ]) {
    await assert.rejects(
      ensureQuickTunnel(async (args) => {
        assert.equal(args[0], "inspect");
        return { stdout: JSON.stringify([{ ...running, Config: config }]) };
      }),
      /not the local|forward only/,
    );
  }
});

test("an expired startup log triggers one scoped restart instead of reusing an old callback", async () => {
  const oldStart = new Date(Date.now() - 600_000).toISOString();
  const newStart = new Date().toISOString();
  let restarts = 0;
  const callback = await ensureQuickTunnel(async (args) => {
    if (args[0] === "restart") restarts++;
    if (args[0] === "inspect")
      return {
        stdout: JSON.stringify([
          {
            ...running,
            State: { Running: true, StartedAt: restarts ? newStart : oldStart },
          },
        ]),
      };
    return {
      stdout: restarts
        ? `${newStart} | https://recovered.trycloudflare.com |`
        : "2000-01-01T00:00:00Z | https://stale.trycloudflare.com |",
      stderr: "",
    };
  });
  assert.equal(restarts, 1);
  assert.equal(
    callback,
    "https://recovered.trycloudflare.com/api/integrations/twitch/eventsub",
  );
});
