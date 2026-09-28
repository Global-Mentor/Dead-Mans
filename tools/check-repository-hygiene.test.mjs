import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(
  new URL("./check-repository-hygiene.mjs", import.meta.url),
);
const ignores = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");

function repository(t) {
  const root = mkdtempSync(join(tmpdir(), "deadmans-hygiene-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "--quiet", root]);
  writeFileSync(join(root, ".gitignore"), ignores);
  return root;
}

function add(root, path, force = false) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, "fixture\n");
  execFileSync("git", ["add", ...(force ? ["--force"] : []), "--", path], {
    cwd: root,
  });
}

function check(root) {
  return spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
}

test("allows maintained product code and docs while local notes remain untracked", (t) => {
  const root = repository(t);
  add(root, "src/ai-integration.ts");
  add(root, "docs/architecture.md");
  mkdirSync(join(root, ".tmp/agent-work"), { recursive: true });
  writeFileSync(join(root, ".tmp/agent-work/review.md"), "local notes\n");
  const result = check(root);
  assert.equal(result.status, 0, result.stderr);
});

test("rejects force-added ignored material and passes after unstaging it", (t) => {
  const root = repository(t);
  const files = [
    "AGENTS.md",
    ".agents/skills/example/SKILL.md",
    ".tmp/agent-work/review.md",
    "docs/reviews/progress.md",
    "docs/development/task-prompt.md",
    "assets/texture.prompt.md",
  ];
  for (const file of files) add(root, file, true);
  const result = check(root);
  assert.equal(result.status, 1);
  for (const file of files) assert.ok(result.stderr.includes(file), file);
  execFileSync("git", ["rm", "--cached", "--", ...files], { cwd: root });
  assert.equal(check(root).status, 0);
});

test("honours nested ignore files and exceptions", (t) => {
  const root = repository(t);
  mkdirSync(join(root, "nested"));
  writeFileSync(join(root, "nested/.gitignore"), "*.scratch\n!kept.scratch\n");
  add(root, "nested/kept.scratch");
  assert.equal(check(root).status, 0);
  add(root, "nested/local.scratch", true);
  assert.equal(check(root).status, 1);
});
