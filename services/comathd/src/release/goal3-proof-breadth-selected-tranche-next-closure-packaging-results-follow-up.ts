import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge } from "./goal3-proof-breadth-selected-tranche-next-closure-execution-bridge.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough } from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-follow-through.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge } from "./goal3-proof-breadth-selected-tranche-next-execution-bridge.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUpInput
} from "./goal3-proof-breadth-selected-tranche-next-packaging-results-follow-up.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type PersistedSelectedTrancheNextClosurePackagingFollowThrough = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough,
  "selected_tranche_next_closure_packaging_follow_through_artifact"
>;

type PersistedSelectedTrancheNextClosureExecutionBridge = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge,
  "selected_tranche_next_closure_execution_bridge_artifact"
>;

type PersistedSelectedTrancheNextExecutionBridge = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge,
  "selected_tranche_next_execution_bridge_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUpInput = {
  project_id: string;
  selected_tranche_next_closure_packaging_results_follow_up_id?: string;
  selected_tranche_next_closure_packaging_follow_through_id: string;
  selected_tranche_next_closure_packaging_follow_through_path: string;
  selected_tranche_next_closure_packaging_follow_through_sha256: string;
  actor?: string;
  requested_follow_up_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_follow_up";
};

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_follow_up.v1";
  selected_tranche_next_closure_packaging_results_follow_up_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  follow_up_status:
    | "next_closure_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck"
    | "blocked_next_closure_selected_tranche_packaging_results_incomplete";
  selected_tranche_next_closure_packaging_results_follow_up_path: string;
  requested_follow_up_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_follow_up";
  selected_tranche_next_closure_packaging_follow_through_id: string;
  selected_tranche_next_closure_packaging_follow_through_path: string;
  selected_tranche_next_closure_packaging_follow_through_artifact: ArtifactReference;
  selected_tranche_next_closure_execution_bridge_id: string;
  selected_tranche_next_closure_execution_bridge_path: string;
  selected_tranche_next_closure_execution_bridge_artifact: ArtifactReference;
  delegated_selected_tranche_next_execution_bridge_id: string;
  delegated_selected_tranche_next_execution_bridge_path: string;
  delegated_selected_tranche_next_execution_bridge_artifact: ArtifactReference;
  selected_tranche_next_packaging_follow_through_id: string;
  selected_tranche_next_packaging_follow_through_path: string;
  selected_tranche_next_packaging_follow_through_artifact: ArtifactReference;
  task_local_packaging_follow_through_id: string;
  task_local_packaging_follow_through_path: string;
  task_local_packaging_follow_through_artifact: ArtifactReference;
  selected_tranche_next_packaging_results_follow_up_id: string;
  selected_tranche_next_packaging_results_follow_up_path: string;
  selected_tranche_next_packaging_results_follow_up_artifact: ArtifactReference;
  proof_breadth_execution_follow_through_id: string;
  proof_breadth_execution_follow_through_path: string;
  proof_breadth_execution_follow_through_artifact: ArtifactReference;
  blocker_reasons: string[];
  selected_task_count: number;
  verified_selected_task_count: number;
  missing_selected_task_count: number;
  blocked_selected_task_count: number;
  selected_task_ids: string[];
  verified_selected_task_ids: string[];
  missing_selected_task_ids: string[];
  blocked_selected_task_ids: string[];
  selected_packaging_report_artifacts: ArtifactReference[];
  selected_packaging_report_artifacts_current: true;
  ready_for_proof_breadth_closure_recheck: boolean;
  proof_breadth_complete: false;
  final_ga_audit_unblocked: false;
  runs_lean: false;
  executes_proofs: false;
  accepts_caller_success_metadata: false;
  accepts_caller_proof_material: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  ga_certification_gate_separate: true;
  selected_tranche_next_closure_packaging_results_follow_up_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function selectedTrancheNextClosurePackagingResultsFollowUpPath(followUpId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-follow-up",
      followUpId,
      "follow-up.json"
    )
  );
}

function selectedTrancheNextClosurePackagingFollowThroughPath(followThroughId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-follow-through",
      followThroughId,
      "follow-through.json"
    )
  );
}

function selectedTrancheNextClosureExecutionBridgePath(bridgeId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-selected-tranche-next-closure-execution-bridge", bridgeId, "bridge.json")
  );
}

function selectedTrancheNextExecutionBridgePath(bridgeId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-selected-tranche-next-execution-bridge", bridgeId, "bridge.json")
  );
}

function selectedTrancheNextClosurePackagingResultsTask341RecheckId(followUpId: string): string {
  return `${followUpId}-TASK341-RECHECK`;
}

function sha256Bytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,120}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results follow-up hash is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_HASH"
    });
  }
  return sha256;
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-packaging-results-follow-up";
  return text
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .slice(0, 400);
}

function assertTask346Path(inputPath: string | undefined, followThroughId: string): string {
  const normalized = normalizeRelativePath(typeof inputPath === "string" ? inputPath.trim() : "");
  const expected = selectedTrancheNextClosurePackagingFollowThroughPath(followThroughId);
  if (normalized !== expected) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results follow-up Task346 path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_TASK346_PATH_MISMATCH"
    });
  }
  return expected;
}

function parseJsonArtifact<T>(bytes: Buffer): T {
  try {
    return JSON.parse(bytes.toString("utf8")) as T;
  } catch {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results follow-up Task346 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346"
    });
  }
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
    normalizeRelativePath(left.path) === right.path &&
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

function assertCurrentArtifactReference(
  projectRoot: string,
  path: string,
  actual: ArtifactReference,
  kind: string
): ArtifactReference {
  let expected: ArtifactReference;
  try {
    expected = artifactForProjectFile(projectRoot, path, kind);
  } catch {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results follow-up Task346 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346"
    });
  }
  if (!artifactReferencesEqual(actual, expected)) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results follow-up Task346 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346"
    });
  }
  return expected;
}

function assertStringArrayExact(left: unknown, right: unknown): boolean {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => typeof value === "string" && value === right[index])
  );
}

function assertTask344CurrentArtifactReference(
  projectRoot: string,
  projectId: string,
  task346Body: PersistedSelectedTrancheNextClosurePackagingFollowThrough
): {
  artifact: ArtifactReference;
  body: PersistedSelectedTrancheNextClosureExecutionBridge;
} {
  const task344Id = task346Body.selected_tranche_next_closure_execution_bridge_id;
  const expectedPath = selectedTrancheNextClosureExecutionBridgePath(task344Id);
  if (
    normalizeRelativePath(task346Body.selected_tranche_next_closure_execution_bridge_path) !== expectedPath ||
    normalizeRelativePath(task346Body.selected_tranche_next_closure_execution_bridge_artifact.path) !== expectedPath
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results follow-up Task346 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346"
    });
  }
  const artifact = assertCurrentArtifactReference(
    projectRoot,
    expectedPath,
    task346Body.selected_tranche_next_closure_execution_bridge_artifact,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge"
  );
  const absolutePath = assertPathAllowed(projectRoot, expectedPath);
  const body = parseJsonArtifact<PersistedSelectedTrancheNextClosureExecutionBridge>(readFileSync(absolutePath));
  if (
    body.schema_version !== "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_execution_bridge_id !== task344Id ||
    normalizeRelativePath(body.selected_tranche_next_closure_execution_bridge_path) !== expectedPath ||
    body.delegated_selected_tranche_next_execution_bridge_id !==
      task346Body.delegated_selected_tranche_next_execution_bridge_id ||
    normalizeRelativePath(body.delegated_selected_tranche_next_execution_bridge_path) !==
      normalizeRelativePath(task346Body.delegated_selected_tranche_next_execution_bridge_path) ||
    !artifactReferencesEqual(
      body.delegated_selected_tranche_next_execution_bridge_artifact,
      task346Body.delegated_selected_tranche_next_execution_bridge_artifact
    ) ||
    body.proof_breadth_complete !== false ||
    body.runs_lean !== false ||
    body.executes_proofs !== false ||
    body.accepts_caller_success_metadata !== false ||
    body.accepts_caller_proof_material !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results follow-up Task346 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346"
    });
  }
  return { artifact, body };
}

function assertTask338CurrentArtifactReference(
  projectRoot: string,
  projectId: string,
  task346Body: PersistedSelectedTrancheNextClosurePackagingFollowThrough,
  task344Body: PersistedSelectedTrancheNextClosureExecutionBridge
): ArtifactReference {
  const task338Id = task346Body.delegated_selected_tranche_next_execution_bridge_id;
  const expectedPath = selectedTrancheNextExecutionBridgePath(task338Id);
  if (
    normalizeRelativePath(task346Body.delegated_selected_tranche_next_execution_bridge_path) !== expectedPath ||
    normalizeRelativePath(task346Body.delegated_selected_tranche_next_execution_bridge_artifact.path) !== expectedPath
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results follow-up Task346 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346"
    });
  }
  const artifact = assertCurrentArtifactReference(
    projectRoot,
    expectedPath,
    task346Body.delegated_selected_tranche_next_execution_bridge_artifact,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge"
  );
  const absolutePath = assertPathAllowed(projectRoot, expectedPath);
  const body = parseJsonArtifact<PersistedSelectedTrancheNextExecutionBridge>(readFileSync(absolutePath));
  const task338NextBridgeArtifact = body.next_proof_breadth_execution_bridge_artifact;
  const task344NextBridgeArtifact = task344Body.next_proof_breadth_execution_bridge_artifact;
  if (
    body.schema_version !== "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_execution_bridge_id !== task338Id ||
    normalizeRelativePath(body.selected_tranche_next_execution_bridge_path) !== expectedPath ||
    !assertStringArrayExact(body.next_execution_task_ids, task344Body.next_execution_task_ids) ||
    typeof body.next_proof_breadth_execution_bridge_id !== "string" ||
    typeof task344Body.next_proof_breadth_execution_bridge_id !== "string" ||
    body.next_proof_breadth_execution_bridge_id !== task344Body.next_proof_breadth_execution_bridge_id ||
    typeof body.next_proof_breadth_execution_bridge_path !== "string" ||
    typeof task344Body.next_proof_breadth_execution_bridge_path !== "string" ||
    body.next_proof_breadth_execution_bridge_path !== task344Body.next_proof_breadth_execution_bridge_path ||
    !isArtifactReference(task338NextBridgeArtifact) ||
    !isArtifactReference(task344NextBridgeArtifact) ||
    !artifactReferencesEqual(task338NextBridgeArtifact, task344NextBridgeArtifact) ||
    body.proof_breadth_complete !== false ||
    body.runs_lean !== false ||
    body.executes_proofs !== false ||
    body.accepts_caller_success_metadata !== false ||
    body.accepts_caller_proof_material !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results follow-up Task346 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346"
    });
  }
  return artifact;
}

function readTask346Artifact(
  projectRoot: string,
  projectId: string,
  followThroughId: string,
  followThroughPath: string,
  followThroughSha256: string
): {
  body: PersistedSelectedTrancheNextClosurePackagingFollowThrough;
  artifact: ArtifactReference;
  references: {
    selectedTrancheNextClosureExecutionBridgeArtifact: ArtifactReference;
    delegatedSelectedTrancheNextExecutionBridgeArtifact: ArtifactReference;
    selectedTrancheNextPackagingFollowThroughArtifact: ArtifactReference;
    taskLocalPackagingFollowThroughArtifact: ArtifactReference;
  };
} {
  const absolutePath = assertPathAllowed(projectRoot, followThroughPath);
  if (!existsSync(absolutePath)) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results follow-up Task346 artifact is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_TASK346_MISSING"
    });
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== followThroughSha256) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results follow-up Task346 artifact is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK346"
    });
  }
  const body = parseJsonArtifact<PersistedSelectedTrancheNextClosurePackagingFollowThrough>(bytes);
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_follow_through.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_follow_through_id !== followThroughId ||
    normalizeRelativePath(body.selected_tranche_next_closure_packaging_follow_through_path) !== followThroughPath ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.proof_breadth_complete !== false ||
    body.final_ga_audit_unblocked !== false ||
    body.runs_lean !== false ||
    body.executes_proofs !== false ||
    body.accepts_caller_success_metadata !== false ||
    body.accepts_caller_proof_material !== false ||
    typeof body.selected_tranche_next_closure_execution_bridge_id !== "string" ||
    typeof body.selected_tranche_next_closure_execution_bridge_path !== "string" ||
    !isArtifactReference(body.selected_tranche_next_closure_execution_bridge_artifact) ||
    typeof body.delegated_selected_tranche_next_execution_bridge_id !== "string" ||
    typeof body.delegated_selected_tranche_next_execution_bridge_path !== "string" ||
    !isArtifactReference(body.delegated_selected_tranche_next_execution_bridge_artifact) ||
    typeof body.selected_tranche_next_packaging_follow_through_id !== "string" ||
    typeof body.selected_tranche_next_packaging_follow_through_path !== "string" ||
    !isArtifactReference(body.selected_tranche_next_packaging_follow_through_artifact) ||
    typeof body.task_local_packaging_follow_through_id !== "string" ||
    typeof body.task_local_packaging_follow_through_path !== "string" ||
    !isArtifactReference(body.task_local_packaging_follow_through_artifact)
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results follow-up Task346 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346"
    });
  }
  const task344 = assertTask344CurrentArtifactReference(projectRoot, projectId, body);
  const references = {
    selectedTrancheNextClosureExecutionBridgeArtifact: task344.artifact,
    delegatedSelectedTrancheNextExecutionBridgeArtifact: assertTask338CurrentArtifactReference(
      projectRoot,
      projectId,
      body,
      task344.body
    ),
    selectedTrancheNextPackagingFollowThroughArtifact: assertCurrentArtifactReference(
      projectRoot,
      body.selected_tranche_next_packaging_follow_through_path,
      body.selected_tranche_next_packaging_follow_through_artifact,
      "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_follow_through"
    ),
    taskLocalPackagingFollowThroughArtifact: assertCurrentArtifactReference(
      projectRoot,
      body.task_local_packaging_follow_through_path,
      body.task_local_packaging_follow_through_artifact,
      "goal3_release_candidate_proof_breadth_task_local_packaging_follow_through"
    )
  };
  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_follow_through",
      path: followThroughPath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    },
    references
  };
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUpInput
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
    record.proof_breadth_closure_json !== undefined
  );
}

function assertStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUpInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp {
  const projectId = assertSafeId(input.project_id, "project_id");
  const followUpId = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_follow_up_id,
    "selected_tranche_next_closure_packaging_results_follow_up_id"
  );
  const task346Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_follow_through_id,
    "selected_tranche_next_closure_packaging_follow_through_id"
  );
  const task346Sha256 = assertSha256(input.selected_tranche_next_closure_packaging_follow_through_sha256);
  const task346Path = assertTask346Path(input.selected_tranche_next_closure_packaging_follow_through_path, task346Id);
  const requestedMode =
    input.requested_follow_up_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_follow_up";
  if (requestedMode !== "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_follow_up") {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results follow-up mode is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_MODE"
    });
  }

  const followUpPath = selectedTrancheNextClosurePackagingResultsFollowUpPath(followUpId);
  const absoluteFollowUpPath = assertPathAllowed(projectRoot, followUpPath, { purpose: "runtime-write" });
  if (existsSync(absoluteFollowUpPath)) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results follow-up already exists", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_ALREADY_EXISTS"
    });
  }

  const task346 = readTask346Artifact(projectRoot, projectId, task346Id, task346Path, task346Sha256);
  if (task346.body.project_id !== projectId) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results follow-up project id mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346"
    });
  }

  const actor = sanitizeActor(input.actor);
  const task341Input = {
    project_id: projectId,
    selected_tranche_next_packaging_results_follow_up_id: `${followUpId}-TASK341`,
    proof_breadth_execution_follow_through_id: selectedTrancheNextClosurePackagingResultsTask341RecheckId(followUpId),
    selected_tranche_next_packaging_follow_through_id:
      task346.body.selected_tranche_next_packaging_follow_through_id,
    selected_tranche_next_packaging_follow_through_path:
      task346.references.selectedTrancheNextPackagingFollowThroughArtifact.path,
    selected_tranche_next_packaging_follow_through_sha256:
      task346.references.selectedTrancheNextPackagingFollowThroughArtifact.sha256,
    actor,
    requested_follow_up_mode: "open_formal_workbench_release_candidate_selected_tranche_next_packaging_results_follow_up"
  } satisfies Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUpInput;
  const task341 = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp(
    projectRoot,
    task341Input
  );
  const task341Artifact = artifactForProjectFile(
    projectRoot,
    task341.selected_tranche_next_packaging_results_follow_up_path,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up"
  );
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const blockerReasons = uniqueStrings([
    ...assertStringArray(task346.body.blocker_reasons),
    ...task341.blocker_reasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);
  const body = {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_follow_up.v1",
    selected_tranche_next_closure_packaging_results_follow_up_id: followUpId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: task341.ok,
    follow_up_status: task341.ok
      ? "next_closure_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck"
      : "blocked_next_closure_selected_tranche_packaging_results_incomplete",
    selected_tranche_next_closure_packaging_results_follow_up_path: followUpPath,
    requested_follow_up_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_follow_up",
    selected_tranche_next_closure_packaging_follow_through_id: task346Id,
    selected_tranche_next_closure_packaging_follow_through_path: task346Path,
    selected_tranche_next_closure_packaging_follow_through_artifact: task346.artifact,
    selected_tranche_next_closure_execution_bridge_id: task346.body.selected_tranche_next_closure_execution_bridge_id,
    selected_tranche_next_closure_execution_bridge_path:
      task346.references.selectedTrancheNextClosureExecutionBridgeArtifact.path,
    selected_tranche_next_closure_execution_bridge_artifact:
      task346.references.selectedTrancheNextClosureExecutionBridgeArtifact,
    delegated_selected_tranche_next_execution_bridge_id:
      task346.body.delegated_selected_tranche_next_execution_bridge_id,
    delegated_selected_tranche_next_execution_bridge_path:
      task346.references.delegatedSelectedTrancheNextExecutionBridgeArtifact.path,
    delegated_selected_tranche_next_execution_bridge_artifact:
      task346.references.delegatedSelectedTrancheNextExecutionBridgeArtifact,
    selected_tranche_next_packaging_follow_through_id: task346.body.selected_tranche_next_packaging_follow_through_id,
    selected_tranche_next_packaging_follow_through_path:
      task346.references.selectedTrancheNextPackagingFollowThroughArtifact.path,
    selected_tranche_next_packaging_follow_through_artifact:
      task346.references.selectedTrancheNextPackagingFollowThroughArtifact,
    task_local_packaging_follow_through_id: task346.body.task_local_packaging_follow_through_id,
    task_local_packaging_follow_through_path: task346.references.taskLocalPackagingFollowThroughArtifact.path,
    task_local_packaging_follow_through_artifact: task346.references.taskLocalPackagingFollowThroughArtifact,
    selected_tranche_next_packaging_results_follow_up_id:
      task341.selected_tranche_next_packaging_results_follow_up_id,
    selected_tranche_next_packaging_results_follow_up_path:
      task341.selected_tranche_next_packaging_results_follow_up_path,
    selected_tranche_next_packaging_results_follow_up_artifact: task341Artifact,
    proof_breadth_execution_follow_through_id: task341.proof_breadth_execution_follow_through_id,
    proof_breadth_execution_follow_through_path: task341.proof_breadth_execution_follow_through_path,
    proof_breadth_execution_follow_through_artifact: task341.proof_breadth_execution_follow_through_artifact,
    blocker_reasons: blockerReasons,
    selected_task_count: task341.selected_task_count,
    verified_selected_task_count: task341.verified_selected_task_count,
    missing_selected_task_count: task341.missing_selected_task_count,
    blocked_selected_task_count: task341.blocked_selected_task_count,
    selected_task_ids: task341.selected_task_ids,
    verified_selected_task_ids: task341.verified_selected_task_ids,
    missing_selected_task_ids: task341.missing_selected_task_ids,
    blocked_selected_task_ids: task341.blocked_selected_task_ids,
    selected_packaging_report_artifacts: task341.selected_packaging_report_artifacts,
    selected_packaging_report_artifacts_current: true,
    ready_for_proof_breadth_closure_recheck: task341.ready_for_proof_breadth_closure_recheck,
    proof_breadth_complete: false,
    final_ga_audit_unblocked: false,
    runs_lean: false,
    executes_proofs: false,
    accepts_caller_success_metadata: false,
    accepts_caller_proof_material: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp,
    "selected_tranche_next_closure_packaging_results_follow_up_artifact"
  >;

  const followUpText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteFollowUpPath), { recursive: true });
  writeFileSync(absoluteFollowUpPath, followUpText, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp = {
    ...body,
    selected_tranche_next_closure_packaging_results_follow_up_artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_follow_up",
      path: followUpPath,
      sha256: sha256Text(followUpText),
      size_bytes: Buffer.byteLength(followUpText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_selected_tranche_next_closure_packaging_results_follow_up_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_packaging_results_follow_up_id: followUpId,
      follow_up_status: result.follow_up_status,
      selected_tranche_next_closure_packaging_results_follow_up_path: followUpPath,
      selected_tranche_next_closure_packaging_results_follow_up_artifact_sha256:
        result.selected_tranche_next_closure_packaging_results_follow_up_artifact.sha256,
      selected_tranche_next_closure_packaging_follow_through_id: task346Id,
      selected_tranche_next_closure_packaging_follow_through_artifact_sha256: task346.artifact.sha256,
      selected_tranche_next_packaging_results_follow_up_id:
        result.selected_tranche_next_packaging_results_follow_up_id,
      selected_tranche_next_packaging_results_follow_up_artifact_sha256:
        result.selected_tranche_next_packaging_results_follow_up_artifact.sha256,
      selected_tranche_next_packaging_follow_through_id: result.selected_tranche_next_packaging_follow_through_id,
      task_local_packaging_follow_through_id: result.task_local_packaging_follow_through_id,
      selected_task_ids: result.selected_task_ids,
      verified_selected_task_count: result.verified_selected_task_count,
      missing_selected_task_count: result.missing_selected_task_count,
      blocked_selected_task_count: result.blocked_selected_task_count,
      ready_for_proof_breadth_closure_recheck: result.ready_for_proof_breadth_closure_recheck,
      blocker_reasons: result.blocker_reasons,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}
