#!/usr/bin/env node
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { createComathServer } from "./api/server.js";
import { loadConfig, researchConfigSchema } from "./config/config.js";
import { inspectRuntimeDoctor } from "./control/runtime-doctor.js";
import { toComathError } from "./errors.js";

function argumentsFor(argv: string[]) {
  const [command, ...rest] = argv;
  if (command !== "serve" && command !== "doctor") throw new Error("Usage: comathd serve|doctor --project-root <absolute> --config <absolute> [--host 127.0.0.1] [--port 8787]");
  const values = new Map<string, string>();
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index], value = rest[index + 1];
    if (!["--project-root", "--config", "--host", "--port"].includes(key) || value === undefined || values.has(key)) throw new Error("Unknown, incomplete, or duplicate CLI option");
    values.set(key, value);
  }
  const root = values.get("--project-root"), config = values.get("--config");
  if (!root || !isAbsolute(root) || !config || !isAbsolute(config)) throw new Error("Project root and host config must be explicit absolute paths");
  if (command === "doctor" && (values.has("--host") || values.has("--port"))) throw new Error("doctor does not open listeners");
  const host = values.get("--host"), port = values.get("--port");
  if (host && !["127.0.0.1", "::1", "localhost"].includes(host)) throw new Error("Operator listener must use loopback");
  if (port !== undefined && (!/^\d+$/.test(port) || Number(port) > 65535)) throw new Error("Port must be an integer in 0..65535");
  return { command, root, config, host, port: port === undefined ? undefined : Number(port) };
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = argumentsFor(argv), config = loadConfig(args.root, { config_path: args.config });
  if (args.command === "doctor") {
    const report = await inspectRuntimeDoctor(args.root, config);
    process.stdout.write(`${JSON.stringify(report)}\n`);
    if (!report.sqlite.available || report.layout.status !== "ok") process.exitCode = 1;
    return;
  }
  const research = config.research ?? researchConfigSchema.parse({});
  const server = createComathServer({ project_root: args.root, research: { config: research } });
  let closing: Promise<void> | undefined;
  const shutdown = () => {
    if (closing) return closing;
    closing = server.close().catch(error => {
      process.exitCode = 1;
      process.stderr.write(`${JSON.stringify({ type: "shutdown_error", code: toComathError(error).code })}\n`);
    }).finally(() => { process.off("SIGINT", onSignal); process.off("SIGTERM", onSignal); });
    return closing;
  };
  const onSignal = () => { void shutdown(); };
  process.on("SIGINT", onSignal); process.on("SIGTERM", onSignal);
  try {
    const listener = await server.listen(args.port ?? research.operator_port, args.host ?? research.operator_host);
    process.stdout.write(`${JSON.stringify({ type: "ready", service: "comathd", pid: process.pid, address: listener.address(),
      research_enabled: research.enabled, proof_authority: "none" })}\n`);
  } catch (error) { await shutdown(); throw error; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch(error => {
    process.exitCode = 1;
    process.stderr.write(`${JSON.stringify({ type: "startup_error", code: toComathError(error).code })}\n`);
  });
}
