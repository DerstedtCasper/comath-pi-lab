import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const adapters = ["codex-cli-adapter.mjs"];

for (const adapter of adapters) {
  const source = join(process.cwd(), "src", "agents", "adapters", adapter);
  const target = join(process.cwd(), "dist", "agents", "adapters", adapter);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}
