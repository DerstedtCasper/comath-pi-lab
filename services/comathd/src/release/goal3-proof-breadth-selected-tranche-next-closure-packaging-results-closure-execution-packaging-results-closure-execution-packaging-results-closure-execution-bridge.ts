import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge
} from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-bridge.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck } from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type PersistedTask361ClosureRecheck = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck,
  "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridgeInput =
  {
    project_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id?: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id?: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_sha256: string;
    actor?: string;
    requested_bridge_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge";
    max_tranche_size?: number;
  };

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge =
  {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge.v1";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id: string;
    project_id: string;
    actor: string;
    created_at: string;
    ok: boolean;
    bridge_status:
      | "ready_for_next_selected_tranche_execution"
      | "complete_proof_breadth_requires_task301_final_ga_audit_binding"
      | "blocked_next_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_not_ready_for_closure_execution";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path: string;
    requested_bridge_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: ArtifactReference;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact: ArtifactReference;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: ArtifactReference;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      | ArtifactReference
      | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      | string
      | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      | string
      | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      | ArtifactReference
      | null;
    next_proof_breadth_execution_bridge_id: string | null;
    next_proof_breadth_execution_bridge_path: string | null;
    next_proof_breadth_execution_bridge_artifact: ArtifactReference | null;
    completed_selected_task_ids: string[];
    completed_selected_task_count: number;
    next_execution_task_ids: string[];
    max_tranche_size: number;
    blocker_reasons: string[];
    proof_breadth_complete: boolean;
    final_ga_audit_unblocked: boolean;
    runs_lean: false;
    executes_proofs: false;
    accepts_caller_success_metadata: false;
    accepts_caller_proof_material: false;
    proof_authority: "none";
    can_promote_claim: false;
    can_certify_ga: false;
    ga_certification_gate_separate: true;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact: ArtifactReference;
  };

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function bridgePath(bridgeId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge",
      bridgeId,
      "bridge.json"
    )
  );
}

function task361Path(recheckId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck",
      recheckId,
      "recheck.json"
    )
  );
}

function sha256Bytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function shortIdSuffix(id: string): string {
  return sha256Text(id).slice(0, 12).toUpperCase();
}

function errorCode(suffix: string): string {
  return `GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_BRIDGE_${suffix}`;
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,240}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: errorCode("INVALID_ID")
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution bridge hash is invalid",
      {
        statusCode: 400,
        code: errorCode("INVALID_HASH")
      }
    );
  }
  return sha256;
}

function assertMaxTrancheSize(value: number | undefined): number {
  if (value === undefined) {
    return 2;
  }
  if (!Number.isSafeInteger(value) || value < 1 || value > 10) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution bridge tranche size is invalid",
      {
        statusCode: 400,
        code: errorCode("INVALID_TRANCHE")
      }
    );
  }
  return value;
}

function assertTask361InputPath(path: string | undefined, recheckId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof path === "string" ? path.trim() : "");
  const expectedPath = task361Path(recheckId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution bridge Task361 path mismatch",
      {
        statusCode: 400,
        code: errorCode("TASK361_PATH_MISMATCH")
      }
    );
  }
  return expectedPath;
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge";
  return text
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .slice(0, 400);
}

function isArtifactReference(value: unknown): value is ArtifactReference {
  const record = value as ArtifactReference;
  return (
    typeof record?.kind === "string" &&
    typeof record.path === "string" &&
    /^[a-f0-9]{64}$/u.test(record.sha256) &&
    typeof record.size_bytes === "number" &&
    Number.isFinite(record.size_bytes) &&
    record.size_bytes >= 0
  );
}

function artifactReferencesEqual(left: ArtifactReference, right: ArtifactReference): boolean {
  return (
    left.kind === right.kind &&
    normalizeRelativePath(left.path) === normalizeRelativePath(right.path) &&
    left.sha256 === right.sha256 &&
    left.size_bytes === right.size_bytes
  );
}

function artifactForProjectFile(projectRoot: string, path: string, kind: string): ArtifactReference {
  const normalized = normalizeRelativePath(path);
  const absolutePath = assertPathAllowed(projectRoot, normalized);
  const bytes = readFileSync(absolutePath);
  return {
    kind,
    path: normalized,
    sha256: sha256Bytes(bytes),
    size_bytes: statSync(absolutePath).size
  };
}

function invalidTask361(): never {
  throw new ComathError(
    "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution bridge Task361 artifact is invalid",
    {
      statusCode: 400,
      code: errorCode("INVALID_TASK361")
    }
  );
}

function assertStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    invalidTask361();
  }
  return value as string[];
}

function assertCurrentArtifactReference(
  projectRoot: string,
  path: string,
  artifact: unknown,
  kind: string
): ArtifactReference {
  if (!isArtifactReference(artifact) || artifact.kind !== kind || normalizeRelativePath(artifact.path) !== normalizeRelativePath(path)) {
    invalidTask361();
  }
  let current: ArtifactReference;
  try {
    current = artifactForProjectFile(projectRoot, path, kind);
  } catch {
    invalidTask361();
  }
  if (!artifactReferencesEqual(artifact, current)) {
    invalidTask361();
  }
  return current;
}

function parseTask361(bytes: Buffer): PersistedTask361ClosureRecheck {
  try {
    return JSON.parse(bytes.toString("utf8")) as PersistedTask361ClosureRecheck;
  } catch {
    invalidTask361();
  }
}

function sanitizeBlockerReason(value: string, source: "task361" | "delegated"): string {
  const trimmed = value.trim();
  const sanitized = sanitizeActor(trimmed);
  if (sanitized !== trimmed || !/^[A-Za-z0-9_.:-]{1,200}$/u.test(trimmed)) {
    return source === "task361" ? "task361_blocker_reason_redacted" : "delegated_blocker_reason_redacted";
  }
  return trimmed;
}

function sanitizeBlockerReasons(values: string[], source: "task361" | "delegated"): string[] {
  return values.map((value) => sanitizeBlockerReason(value, source));
}

function readTask361Artifact(
  projectRoot: string,
  projectId: string,
  recheckId: string,
  recheckPath: string,
  expectedSha256: string
): {
  body: PersistedTask361ClosureRecheck;
  artifact: ArtifactReference;
  refs: {
    task356: ArtifactReference;
    task355: ArtifactReference;
    delegatedTask355: ArtifactReference | null;
  };
  blockerReasons: string[];
} {
  const absolutePath = assertPathAllowed(projectRoot, recheckPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution bridge Task361 artifact is missing",
      {
        statusCode: 404,
        code: errorCode("TASK361_MISSING")
      }
    );
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution bridge Task361 artifact is stale",
      {
        statusCode: 409,
        code: errorCode("STALE_TASK361")
      }
    );
  }
  const body = parseTask361(bytes);
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id !==
      recheckId ||
    normalizeRelativePath(
      body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path
    ) !== recheckPath ||
    body.selected_packaging_report_artifacts_current !== true ||
    body.proof_breadth_complete !== false ||
    body.final_ga_audit_unblocked !== false ||
    body.runs_lean !== false ||
    body.executes_proofs !== false ||
    body.accepts_caller_success_metadata !== false ||
    body.accepts_caller_proof_material !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true ||
    !Array.isArray(body.selected_task_ids) ||
    !Array.isArray(body.selected_packaging_report_artifacts) ||
    !Array.isArray(body.blocker_reasons)
  ) {
    invalidTask361();
  }
  const copiedTask356 = assertCurrentArtifactReference(
    projectRoot,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge"
  );
  const copiedTask355 = assertCurrentArtifactReference(
    projectRoot,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
  );
  let delegatedTask355: ArtifactReference | null = null;
  if (
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id !==
      null ||
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path !==
      null ||
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact !==
      null
  ) {
    if (
      typeof body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id !==
        "string" ||
      typeof body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path !==
        "string"
    ) {
      invalidTask361();
    }
    delegatedTask355 = assertCurrentArtifactReference(
      projectRoot,
      body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path,
      body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
      "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
    );
  }
  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck",
      path: recheckPath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    },
    refs: {
      task356: copiedTask356,
      task355: copiedTask355,
      delegatedTask355
    },
    blockerReasons: sanitizeBlockerReasons(assertStringArray(body.blocker_reasons), "task361")
  };
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridgeInput
): boolean {
  const record = input as Record<string, unknown>;
  return (
    record.proof_breadth_matrix !== undefined ||
    record.proof_breadth_matrix_path !== undefined ||
    record.proof_breadth_matrix_sha256 !== undefined ||
    record.proof_artifact !== undefined ||
    record.proof_claim !== undefined ||
    record.lean_replay_manifest !== undefined ||
    record.final_replay_manifest !== undefined ||
    record.final_authority_packaging_report !== undefined ||
    record.executor_result !== undefined ||
    record.proof_authority !== undefined ||
    record.can_certify_ga !== undefined ||
    record.can_promote_claim !== undefined ||
    record.final_ga_audit_json !== undefined ||
    record.final_ga_audit_id !== undefined ||
    record.proof_breadth_closure_json !== undefined ||
    record.proof_breadth_closure_id !== undefined ||
    record.ga_certificate_id !== undefined
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function persistResult(
  absoluteOutputPath: string,
  body: Omit<
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact"
  >
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge {
  const text = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, text, "utf8");
  return {
    ...body,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      {
        kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge",
        path: body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
        sha256: sha256Text(text),
        size_bytes: Buffer.byteLength(text, "utf8")
      }
  };
}

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridgeInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge {
  const projectId = assertSafeId(input.project_id, "project_id");
  const bridgeId = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id"
  );
  const task361Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id"
  );
  const task361Sha256 = assertSha256(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_sha256
  );
  const task361RelativePath = assertTask361InputPath(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path,
    task361Id
  );
  const requestedMode =
    input.requested_bridge_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge";
  if (
    requestedMode !==
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge"
  ) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution bridge mode is invalid",
      {
        statusCode: 400,
        code: errorCode("INVALID_MODE")
      }
    );
  }
  const maxTrancheSize = assertMaxTrancheSize(input.max_tranche_size);
  const outputPath = bridgePath(bridgeId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath)) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution bridge already exists",
      {
        statusCode: 409,
        code: errorCode("ALREADY_EXISTS")
      }
    );
  }

  const task361 = readTask361Artifact(projectRoot, projectId, task361Id, task361RelativePath, task361Sha256);
  const actor = sanitizeActor(input.actor);
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const baseBlockerReasons = uniqueStrings([
    ...task361.blockerReasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);

  let delegated:
    | Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge
    | null = null;
  if (task361.refs.delegatedTask355) {
    delegated = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge(
      projectRoot,
      {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
          input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id ??
          `G3-T362-T356-${shortIdSuffix(bridgeId)}`,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
          task361.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id as string,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
          task361.refs.delegatedTask355.path,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_sha256:
          task361.refs.delegatedTask355.sha256,
        actor,
        requested_bridge_mode:
          "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge",
        max_tranche_size: maxTrancheSize
      }
    );
    if (
      delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id !==
        task361.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id ||
      normalizeRelativePath(delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path) !==
        task361.refs.delegatedTask355.path ||
      !artifactReferencesEqual(
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
        task361.refs.delegatedTask355
      )
    ) {
      throw new ComathError(
        "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution bridge delegated Task356 material is inconsistent",
        {
          statusCode: 409,
          code: errorCode("TASK356_DELEGATED_MISMATCH")
        }
      );
    }
  }

  const delegatedBlockerReasons = delegated ? sanitizeBlockerReasons(delegated.blocker_reasons, "delegated") : [];
  const blockerReasons = uniqueStrings([
    ...baseBlockerReasons,
    ...delegatedBlockerReasons,
    ...(delegated ? [] : ["task361_not_ready_for_closure_execution"])
  ]);
  const body = {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      bridgeId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: delegated?.ok ?? false,
    bridge_status:
      delegated?.bridge_status ??
      "blocked_next_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_not_ready_for_closure_execution",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      outputPath,
    requested_bridge_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task361Id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task361RelativePath,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task361.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task361.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task361.refs.task356.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task361.refs.task356,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task361.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task361.refs.task355.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task361.refs.task355,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task361.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task361.refs.delegatedTask355?.path ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task361.refs.delegatedTask355,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      delegated?.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      delegated?.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      delegated?.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact ??
      null,
    next_proof_breadth_execution_bridge_id: delegated?.next_proof_breadth_execution_bridge_id ?? null,
    next_proof_breadth_execution_bridge_path: delegated?.next_proof_breadth_execution_bridge_path ?? null,
    next_proof_breadth_execution_bridge_artifact: delegated?.next_proof_breadth_execution_bridge_artifact ?? null,
    completed_selected_task_ids: delegated?.completed_selected_task_ids ?? [],
    completed_selected_task_count: delegated?.completed_selected_task_count ?? 0,
    next_execution_task_ids: delegated?.next_execution_task_ids ?? [],
    max_tranche_size: maxTrancheSize,
    blocker_reasons: blockerReasons,
    proof_breadth_complete: delegated?.proof_breadth_complete ?? false,
    final_ga_audit_unblocked: delegated?.final_ga_audit_unblocked ?? false,
    runs_lean: false,
    executes_proofs: false,
    accepts_caller_success_metadata: false,
    accepts_caller_proof_material: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact"
  >;

  const result = persistResult(absoluteOutputPath, body);
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type:
      "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
        bridgeId,
      bridge_status: result.bridge_status,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
        outputPath,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact_sha256:
        result
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact
          .sha256,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
        task361Id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact_sha256:
        task361.artifact.sha256,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact_sha256:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact
          ?.sha256 ?? null,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact_sha256:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact
          ?.sha256 ??
        null,
      next_proof_breadth_execution_bridge_id: result.next_proof_breadth_execution_bridge_id,
      completed_selected_task_ids: result.completed_selected_task_ids,
      next_execution_task_ids: result.next_execution_task_ids,
      proof_breadth_complete: result.proof_breadth_complete,
      final_ga_audit_unblocked: result.final_ga_audit_unblocked,
      blocker_reasons: result.blocker_reasons,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}
