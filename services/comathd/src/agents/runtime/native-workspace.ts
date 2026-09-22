import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { z } from "zod";
import { ComathError } from "../../errors.js";
import { resolveProjectCommitPath } from "../../research/project-commit.js";

const scopeSchema = z.strictObject({ campaign_id: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/),
  task_id: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/), generation: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) });
export type NativeWorkspaceDescriptor = z.infer<typeof scopeSchema> & {
  workspace: string; context: string; tool_tmp: string; runtime_home: string;
  readiness: "deferred_by_operator" | "verified_native_sandbox"; isolation_verified: boolean;
};
/** Resolve a generation's paths without creating directories or approving execution. */
export function describeNativeWorkspace(root: string, input: z.infer<typeof scopeSchema>): NativeWorkspaceDescriptor {
  const scope = scopeSchema.parse(input);
  const base = `.tmp/comath/research/${scope.campaign_id}/${scope.task_id}/g${scope.generation}`;
  const paths = { workspace: resolveProjectCommitPath(root, `${base}/workspace`), context: resolveProjectCommitPath(root, `${base}/context`),
    tool_tmp: resolveProjectCommitPath(root, `${base}/tool-tmp`), runtime_home: resolveProjectCommitPath(root, `${base}/runtime/codex`) };
  return { ...scope, ...paths, readiness: "deferred_by_operator", isolation_verified: false };
}
/** Nonintrusive scaffold requested by the operator; it performs no sandbox setup or ACL changes. */
export function prepareNativeWorkspace(root: string, input: z.infer<typeof scopeSchema>): NativeWorkspaceDescriptor {
  const descriptor = describeNativeWorkspace(root, input);
  for (const path of [descriptor.workspace, descriptor.context, descriptor.tool_tmp, descriptor.runtime_home]) mkdirSync(path, { recursive: true });
  return descriptor;
}

export type NativeSandboxPreflightInput = { binary: string; workspace: NativeWorkspaceDescriptor; signal: AbortSignal };

function preflightEnvironment() {
  const env = { ...process.env };
  const credentialName = /(?:^|_)(?:API|ACCESS|AUTH(?:ORIZATION)?|BEARER|CREDENTIALS?|PASSWORD|PRIVATE|SECRET|TOKEN|KEY)(?:_|$)/i;
  for (const key of Object.keys(env)) if (credentialName.test(key) || /HOST_APPROVAL|PROVIDER|WORKER/i.test(key)) delete env[key];
  return env;
}

async function runSandboxCommand(input: NativeSandboxPreflightInput, target: string) {
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(input.binary, ["sandbox", "-P", ":workspace", "-c", 'windows.sandbox="elevated"', "-C", input.workspace.workspace,
      "--", process.execPath, "-e", "require('node:fs').writeFileSync(process.argv[1], 'comath-native-sandbox-probe')", target], {
      cwd: input.workspace.workspace, env: preflightEnvironment(), stdio: "ignore", windowsHide: true
    });
    let settled = false;
    const finish = (value?: number, error?: Error) => {
      if (settled) return;
      settled = true;
      input.signal.removeEventListener("abort", abort);
      if (error) reject(error); else resolve(value ?? 1);
    };
    const abort = () => { if (!child.killed) child.kill(); finish(undefined, new ComathError("Native sandbox preflight aborted", { code: "NATIVE_SANDBOX_NOT_READY", statusCode: 503 })); };
    input.signal.addEventListener("abort", abort, { once: true });
    child.on("error", () => finish(undefined, new ComathError("Native sandbox preflight could not start", { code: "NATIVE_SANDBOX_NOT_READY", statusCode: 503 })));
    child.on("close", code => finish(code ?? 1));
  });
}

/** Run the official Codex sandbox with no model or provider credential before a worker can launch. */
export async function preflightCodexNativeSandbox(input: NativeSandboxPreflightInput): Promise<NativeWorkspaceDescriptor> {
  if (!isAbsolute(input.binary)) throw new ComathError("Native sandbox binary must be absolute", { code: "NATIVE_SANDBOX_NOT_READY", statusCode: 503 });
  input.signal.throwIfAborted();
  const nonce = randomUUID(), allowed = join(input.workspace.workspace, ".native-sandbox-probe", nonce, "allowed.txt"), denied = join(dirname(input.workspace.workspace), ".native-sandbox-probe", nonce, "denied.txt");
  mkdirSync(dirname(allowed), { recursive: true });
  mkdirSync(dirname(denied), { recursive: true });
  if (await runSandboxCommand(input, allowed) !== 0 || !existsSync(allowed)) throw new ComathError("Official Codex sandbox did not permit its workspace probe", { code: "NATIVE_SANDBOX_NOT_READY", statusCode: 503 });
  if (await runSandboxCommand(input, denied) === 0 || existsSync(denied)) throw new ComathError("Official Codex sandbox wrote outside its workspace", { code: "NATIVE_SANDBOX_NOT_READY", statusCode: 503 });
  return { ...input.workspace, readiness: "verified_native_sandbox", isolation_verified: true };
}

/** A workspace directory alone must never authorize untrusted native command execution. */
export function requireNativeSandboxReady(descriptor: NativeWorkspaceDescriptor): void {
  if (!descriptor.isolation_verified || descriptor.readiness !== "verified_native_sandbox") throw new ComathError(`Native sandbox rollout is pending for generation ${descriptor.generation}`, { code: "NATIVE_SANDBOX_NOT_READY", statusCode: 503 });
}
