import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const skip = new Set([
  "tests/integration/phase18-ga-snapshot-replay.test.mjs",
  "tests/integration/phase23-ga-integrity-boundaries.test.mjs",
  "tests/integration/phase23-ga-theorem-family-generalization.test.mjs",
  "tests/integration/phase34-campaign-ensemble-isolation.test.mjs",
  "tests/integration/phase35-final-replay-artifact-paths.test.mjs",
  "tests/integration/phase57-ga-theorem-template-instantiation.test.mjs",
  "tests/integration/phase67-v3-formal-campaign-slice.test.mjs",
  "tests/integration/phase68-v3-negative-ga-slices.test.mjs",
  "tests/integration/phase72-theorem-specific-lean-generation.test.mjs",
  "tests/integration/phase73-bounded-lean-proof-body-synthesis.test.mjs",
  "tests/integration/phase74-bounded-authority-report-preparation.test.mjs",
  "tests/integration/phase75-bounded-final-clean-replay.test.mjs",
  "tests/integration/phase76-registered-nat-linear-targets.test.mjs"
]);

function listTests(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry !== "fixtures" && entry !== "optional") {
        files.push(...listTests(path));
      }
    } else if (entry.endsWith(".test.mjs")) {
      const rel = relative(process.cwd(), path).replace(/\\/g, "/");
      if (!skip.has(rel)) {
        files.push(rel);
      }
    }
  }
  return files;
}

function naturalKey(path) {
  return path.replace(/\d+/g, (digits) => digits.padStart(5, "0"));
}

const tests = listTests(join(process.cwd(), "tests")).sort((left, right) => naturalKey(left).localeCompare(naturalKey(right)));

for (const test of tests) {
  const result = spawnSync(process.execPath, [test], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
