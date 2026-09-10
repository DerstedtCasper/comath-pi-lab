import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const adapters = ["codex-cli-adapter.mjs"];
const helpers = ["provider-helper-protocol.mjs", "provider-helper-collection-probe.mjs"];
const runtimeScripts = ["windows-job-wrapper.ps1"];
for (const script of runtimeScripts) {
  const source = join(process.cwd(), "src", "agents", "runtime", script);
  const target = join(process.cwd(), "dist", "agents", "runtime", script);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

for (const adapter of adapters) {
  const source = join(process.cwd(), "src", "agents", "adapters", adapter);
  const target = join(process.cwd(), "dist", "agents", "adapters", adapter);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

for (const helper of helpers) {
  const source = join(process.cwd(), "src", "agents", "helpers", helper);
  const target = join(process.cwd(), "dist", "agents", "helpers", helper);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}
