import { execFileSync } from "node:child_process";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const files = execFileSync(
  "git",
  [
    "ls-files",
    "--cached",
    "--ignored",
    "--exclude-per-directory=.gitignore",
    "-z",
  ],
  { cwd: root, encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);

if (files.length) {
  console.error("Ignored local files must not be tracked in Git:");
  for (const file of files) console.error(`  ${file}`);
  console.error(
    "Keep local copies outside the Git index and stage their removal.",
  );
  process.exitCode = 1;
} else {
  console.log("Repository hygiene: no ignored files are tracked.");
}
