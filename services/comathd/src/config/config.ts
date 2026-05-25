import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assertPathAllowed } from "../security/path-policy.js";
import { runtimeLayout } from "../project/runtime-layout.js";

export type ComathConfig = {
  version: number;
  allowShell: false;
};

export function loadConfig(projectRoot: string): ComathConfig {
  const configPath = assertPathAllowed(projectRoot, join(runtimeLayout.root, runtimeLayout.configFile), {
    purpose: "read"
  });

  if (!existsSync(configPath)) {
    return { version: 1, allowShell: false };
  }

  const parsed = JSON.parse(readFileSync(configPath, "utf8")) as Partial<ComathConfig>;
  return {
    version: typeof parsed.version === "number" ? parsed.version : 1,
    allowShell: false
  };
}
