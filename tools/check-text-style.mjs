import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = new Set(
  execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root },
  )
    .toString()
    .split("\0")
    .filter(Boolean),
);
let failures = 0;
for (const file of files) {
  const path = join(root, file);
  if (!existsSync(path) || !statSync(path).isFile()) continue;
  const bytes = readFileSync(path);
  if (bytes.includes(0)) continue;
  const lines = bytes.toString("utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (
      /[\u2013\u2014]/u.test(line) ||
      /&(?:mdash|ndash|#8211|#8212|#x2013|#x2014);/iu.test(line)
    ) {
      console.error(
        `${file}:${index + 1}: use an ASCII hyphen instead of a long dash`,
      );
      failures++;
    }
  });
}
if (failures) process.exitCode = 1;
else console.log("Text style: no long dashes found in project files.");
