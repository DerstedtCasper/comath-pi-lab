import { spawnSync } from "node:child_process";
import { existsSync, realpathSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

const args = process.argv.slice(2);
const externalOutputLimit = 32 * 1024;

function valueAfter(flag) {
  const index = args.indexOf(flag);
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

function boundedText(value, limit = externalOutputLimit) {
  const text = String(value ?? "");
  return text.length > limit ? `${text.slice(0, limit)}\n[COMATH_EXTERNAL_OUTPUT_TRUNCATED]` : text;
}

function parsePrefixArgs(rawValue) {
  if (!rawValue) {
    return [];
  }
  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    process.stderr.write("COMATH_CODEX_EXTERNAL_PREFIX_ARGS must be a JSON string array\n");
    process.exit(22);
  }
  if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== "string" || entry.length === 0 || entry.includes("\u0000"))) {
    process.stderr.write("COMATH_CODEX_EXTERNAL_PREFIX_ARGS must be a JSON string array\n");
    process.exit(22);
  }
  return parsed;
}

function resolveExternalProgram() {
  const program = process.env.COMATH_CODEX_EXTERNAL_PROGRAM;
  if (!program) {
    process.stderr.write("external Codex CLI program is not configured\n");
    process.exit(20);
  }
  if (!isAbsolute(program)) {
    process.stderr.write("external Codex CLI program must be absolute\n");
    process.exit(21);
  }
  const absoluteProgram = resolve(program);
  if (!existsSync(absoluteProgram)) {
    process.stderr.write("external Codex CLI program does not exist\n");
    process.exit(21);
  }
  return realpathSync.native(absoluteProgram);
}

function writePromptFiles(goal, contextPath, profile, role) {
  const promptPath = join(process.cwd(), "codex-adapter-prompt.md");
  const goalPath = join(process.cwd(), "codex-adapter-goal.txt");
  writeFileSync(goalPath, goal, "utf8");
  writeFileSync(
    promptPath,
    [
      "# CoMath Pi Lab Adapter Request",
      "",
      `profile: ${profile}`,
      `role: ${role}`,
      `context_path: ${contextPath}`,
      "proof_authority: none",
      "",
      "The external Codex-compatible CLI may draft research or implementation notes only.",
      "It must not claim proof authority, mutate trusted state directly, or promote claims.",
      "",
      "## Goal",
      goal
    ].join("\n"),
    "utf8"
  );
  return { promptPath, goalPath };
}

function renderReport({ adapterPackage, backend, profile, role, contextPath, goal, promptPath, external }) {
  const externalStdout = boundedText(external?.stdout ?? "").trimEnd();
  const externalStderr = boundedText(external?.stderr ?? "").trimEnd();
  return [
    "# Agent Report",
    "",
    "## Input Context",
    `adapter_package: ${adapterPackage}`,
    `adapter_backend: ${backend}`,
    `profile: ${profile}`,
    `role: ${role}`,
    `context_path: ${contextPath}`,
    promptPath ? `external_prompt_file: ${promptPath}` : "external_prompt_file: <none>",
    backend === "external" ? "external_program: <service-configured>" : "external_program: <none>",
    "",
    "## Actions Taken",
    backend === "external"
      ? "Packaged Codex CLI adapter invoked a service-configured external Codex-compatible CLI with fixed argv and wrapped its output as untrusted runtime material."
      : "Packaged Codex CLI adapter launcher validated the profile-bound request and emitted a non-authoritative report envelope.",
    "",
    "## Claims Proposed",
    "No trusted claim promotion.",
    "proof_authority: none",
    "supports_claim_status: none",
    "",
    "## Evidence Produced",
    backend === "external" ? "external_output_untrusted: true" : "No mathematical evidence. This adapter report is runtime output only.",
    backend === "external" ? `external_exit_code: ${external.status}` : `goal_excerpt: ${goal.slice(0, 240)}`,
    backend === "external" && externalStdout ? "" : undefined,
    backend === "external" && externalStdout ? "External stdout excerpt:" : undefined,
    backend === "external" && externalStdout ? externalStdout : undefined,
    backend === "external" && externalStderr ? "" : undefined,
    backend === "external" && externalStderr ? "External stderr excerpt:" : undefined,
    backend === "external" && externalStderr ? externalStderr : undefined,
    "",
    "## Graph Patch",
    "No GraphPatch authority.",
    "",
    "## Blockers",
    backend === "external" && external.status !== 0 ? "External Codex-compatible CLI exited nonzero." : "None reported by packaged adapter launcher.",
    "",
    "## Failed Routes",
    "No proof route certified by this adapter.",
    "",
    "## Self-Review",
    "The adapter package is a controlled launcher surface and does not claim proof authority.",
    "",
    "## Next Actions",
    "Route any useful output through independent review and Lean-backed proof-kernel gates.",
    ""
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

if (args.includes("--health")) {
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      version: "phase44-codex-adapter-v2",
      capabilities: ["agent-report", "profile-routing", "proof-authority-none", "external-cli-fail-closed"]
    })}\n`
  );
  process.exit(0);
}

const profile = valueAfter("--profile") ?? process.env.COMATH_AGENT_PROFILE_ID ?? "unknown";
const role = valueAfter("--role") ?? "unknown";
const goal = valueAfter("--goal") ?? "";
const contextPath = valueAfter("--context") ?? "";
const adapterPackage = valueAfter("--adapter-package") ?? process.env.COMATH_ADAPTER_PACKAGE_ID ?? "codex-cli";
const backend = process.env.COMATH_CODEX_ADAPTER_BACKEND ?? "bundled";

if (process.env.COMATH_PROOF_AUTHORITY !== "none") {
  process.stderr.write("COMATH_PROOF_AUTHORITY must be none\n");
  process.exit(12);
}

if (!goal || !contextPath || !profile) {
  process.stderr.write("missing required adapter launch fields\n");
  process.exit(13);
}

if (backend !== "bundled" && backend !== "external") {
  process.stderr.write("unsupported Codex adapter backend\n");
  process.exit(14);
}

if (backend === "external") {
  const externalProgram = resolveExternalProgram();
  const prefixArgs = parsePrefixArgs(process.env.COMATH_CODEX_EXTERNAL_PREFIX_ARGS);
  const { promptPath, goalPath } = writePromptFiles(goal, contextPath, profile, role);
  const externalArgs = [
    ...prefixArgs,
    "--profile",
    profile,
    "--role",
    role,
    "--goal-file",
    goalPath,
    "--context",
    contextPath,
    "--prompt-file",
    promptPath
  ];
  const external = spawnSync(externalProgram, externalArgs, {
    cwd: process.cwd(),
    shell: false,
    windowsHide: true,
    timeout: 540_000,
    encoding: "utf8",
    maxBuffer: externalOutputLimit * 2,
    env: {
      PATH: process.env.PATH,
      PATHEXT: process.env.PATHEXT,
      SYSTEMROOT: process.env.SYSTEMROOT,
      WINDIR: process.env.WINDIR,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      COMATH_PROOF_AUTHORITY: "none",
      COMATH_AGENT_PROFILE_ID: profile,
      COMATH_ADAPTER_PACKAGE_ID: adapterPackage
    }
  });
  if (external.error) {
    process.stderr.write(`external Codex CLI invocation failed: ${external.error.message}\n`);
    process.exit(23);
  }
  if (external.status !== 0) {
    process.stderr.write(boundedText(external.stderr || external.stdout || "external Codex CLI exited nonzero"));
    process.exit(external.status ?? 24);
  }
  process.stdout.write(
    renderReport({ adapterPackage, backend, profile, role, contextPath, goal, promptPath, external })
  );
  process.exit(0);
}

process.stdout.write(renderReport({ adapterPackage, backend, profile, role, contextPath, goal, promptPath: undefined }));
