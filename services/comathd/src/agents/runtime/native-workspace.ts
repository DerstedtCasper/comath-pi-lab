import { mkdirSync } from "node:fs";
import { z } from "zod";
import { ComathError } from "../../errors.js";
import { resolveProjectCommitPath } from "../../research/project-commit.js";

const scopeSchema = z.strictObject({ campaign_id: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/),
  task_id: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/), generation: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) });
export type NativeWorkspaceDescriptor = z.infer<typeof scopeSchema> & {
  workspace: string; context: string; tool_tmp: string; runtime_home: string;
  readiness: "deferred_by_operator"; isolation_verified: false;
};
/** Nonintrusive scaffold requested by the operator; it performs no sandbox setup or ACL changes. */
export function prepareNativeWorkspace(root: string, input: z.infer<typeof scopeSchema>): NativeWorkspaceDescriptor {
  const scope = scopeSchema.parse(input);
  const base = `.tmp/comath/research/${scope.campaign_id}/${scope.task_id}/g${scope.generation}`;
  const paths = { workspace: resolveProjectCommitPath(root, `${base}/workspace`), context: resolveProjectCommitPath(root, `${base}/context`),
    tool_tmp: resolveProjectCommitPath(root, `${base}/tool-tmp`), runtime_home: resolveProjectCommitPath(root, `${base}/runtime/codex`) };
  for (const path of Object.values(paths)) mkdirSync(path, { recursive: true });
  return { ...scope, ...paths, readiness: "deferred_by_operator", isolation_verified: false };
}
/** A workspace directory alone must never authorize untrusted native command execution. */
export function requireNativeSandboxReady(descriptor: NativeWorkspaceDescriptor): never {
  throw new ComathError(`Native sandbox rollout is pending for generation ${descriptor.generation}`, { code: "NATIVE_SANDBOX_NOT_READY", statusCode: 503 });
}
