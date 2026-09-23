import { execFile, spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(import.meta.dirname, "..");
const dockerDesktopPath = path.join(
  process.env.ProgramFiles ?? "C:\\Program Files",
  "Docker",
  "Docker",
  "Docker Desktop.exe",
);

async function run(command, args, options = {}) {
  return execFileAsync(command, args, {
    cwd: projectRoot,
    timeout: 15_000,
    windowsHide: true,
    ...options,
  });
}

async function isDockerReady() {
  try {
    await run("docker", ["info", "--format", "{{.ServerVersion}}"]);
    return true;
  } catch {
    return false;
  }
}

async function isDockerDesktopRunning() {
  if (process.platform !== "win32") return false;

  try {
    const { stdout } = await run("tasklist", [
      "/FI",
      "IMAGENAME eq Docker Desktop.exe",
      "/FO",
      "CSV",
      "/NH",
    ]);
    return stdout.toLocaleLowerCase().includes("docker desktop.exe");
  } catch {
    return false;
  }
}

async function waitForDocker(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isDockerReady()) return true;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  return false;
}

async function stopBrokenDockerDesktop() {
  try {
    await run("docker", ["desktop", "stop"], { timeout: 10_000 });
  } catch {
    // A crashed backend often leaves the desktop CLI waiting forever.
  }

  for (const imageName of ["Docker Desktop.exe", "com.docker.backend.exe"]) {
    try {
      await run("taskkill", ["/IM", imageName, "/F", "/T"], {
        timeout: 10_000,
      });
    } catch {
      // The process may already be gone.
    }
  }
}

function hasBrokenRuntimeEntry(directory, names) {
  if (!existsSync(directory)) return false;

  try {
    return readdirSync(directory).some((entry) => names.includes(entry));
  } catch {
    // If the directory itself is unreadable, moving it aside is still safer
    // than touching Docker's persistent data directories.
    return true;
  }
}

function moveRuntimeDirectory(directory) {
  const timestamp = new Date().toISOString().replaceAll(/[-:.TZ]/g, "");
  let backup = `${directory}.stale-${timestamp}`;
  let suffix = 1;
  while (existsSync(backup)) {
    backup = `${directory}.stale-${timestamp}-${suffix}`;
    suffix += 1;
  }

  renameSync(directory, backup);
  mkdirSync(directory, { recursive: true });
  console.warn(`Moved broken Docker runtime directory to ${backup}`);
}

function repairWindowsRuntimeDirectories() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    throw new Error(
      "LOCALAPPDATA is not available, so Docker runtime repair cannot continue.",
    );
  }

  const candidates = [
    {
      directory: path.join(localAppData, "Docker", "run"),
      names: ["sailor-ingest.sock", "dockerInference"],
    },
    {
      directory: path.join(localAppData, "docker-secrets-engine"),
      names: ["engine.sock"],
    },
  ];

  for (const candidate of candidates) {
    if (hasBrokenRuntimeEntry(candidate.directory, candidate.names)) {
      moveRuntimeDirectory(candidate.directory);
    }
  }
}

function startDockerDesktop() {
  if (!existsSync(dockerDesktopPath)) {
    throw new Error(`Docker Desktop was not found at ${dockerDesktopPath}.`);
  }

  const child = spawn(dockerDesktopPath, [], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();
}

async function ensureDockerReady() {
  if (await isDockerReady()) return;

  if (process.platform !== "win32") {
    throw new Error("Docker Engine is not running. Start Docker and retry.");
  }

  if (await isDockerDesktopRunning()) {
    console.log("Docker Desktop is starting. Waiting for the engine...");
    if (await waitForDocker(45_000)) return;
  }

  console.log(
    "Docker Engine is unavailable. Repairing stale Windows runtime sockets...",
  );
  await stopBrokenDockerDesktop();
  repairWindowsRuntimeDirectories();
  startDockerDesktop();

  if (!(await waitForDocker(90_000))) {
    throw new Error(
      "Docker Desktop did not become ready within 90 seconds. Check its diagnostic logs.",
    );
  }
}

async function main() {
  await ensureDockerReady();
  const { stdout, stderr } = await run("docker", ["compose", "up", "-d"], {
    timeout: 120_000,
  });
  if (stdout.trim()) process.stdout.write(stdout);
  if (stderr.trim()) process.stderr.write(stderr);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
