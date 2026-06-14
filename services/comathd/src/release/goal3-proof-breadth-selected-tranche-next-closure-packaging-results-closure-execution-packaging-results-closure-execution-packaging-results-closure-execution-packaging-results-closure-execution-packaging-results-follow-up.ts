import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp
} from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type JsonRecord = Record<string, any>;

const TASK371_KIND =
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up";
const TASK370_KIND =
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through";
const TASK368_KIND =
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge";
const TASK367_KIND =
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck";
const TASK364_KIND =
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through";
const TASK365_KIND =
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up";

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUpInput =
  {
    project_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id?: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_sha256: string;
    actor?: string;
    requested_follow_up_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up";
  };

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp =
  JsonRecord & {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up.v1";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id: string;
    project_id: string;
    actor: string;
    created_at: string;
    ok: boolean;
    follow_up_status:
      | "next_closure_execution_packaging_results_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck"
      | "blocked_next_closure_execution_packaging_results_selected_tranche_packaging_results_incomplete"
      | "blocked_next_closure_execution_packaging_results_closure_execution_packaging_not_ready_for_packaging_results_follow_up";
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
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact: ArtifactReference;
  };

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function followUpPath(followUpId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up",
      followUpId,
      "follow-up.json"
    )
  );
}

function task370Path(followThroughId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through",
      followThroughId,
      "follow-through.json"
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
  return `GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_FOLLOW_UP_${suffix}`;
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,340}$/u.test(id)) {
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
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up hash is invalid", {
      statusCode: 400,
      code: errorCode("INVALID_HASH")
    });
  }
  return sha256;
}

function assertTask370InputPath(path: string | undefined, followThroughId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof path === "string" ? path.trim() : "");
  const expectedPath = task370Path(followThroughId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up Task370 path mismatch", {
      statusCode: 400,
      code: errorCode("TASK370_PATH_MISMATCH")
    });
  }
  return expectedPath;
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up";
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

function invalidTask370(): never {
  throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up Task370 artifact is invalid", {
    statusCode: 400,
    code: errorCode("INVALID_TASK370")
  });
}

function assertStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    invalidTask370();
  }
  return value as string[];
}

function assertCurrentArtifactReference(
  projectRoot: string,
  path: unknown,
  artifact: unknown,
  kind: string
): ArtifactReference {
  if (
    typeof path !== "string" ||
    !isArtifactReference(artifact) ||
    artifact.kind !== kind ||
    normalizeRelativePath(artifact.path) !== normalizeRelativePath(path)
  ) {
    invalidTask370();
  }
  let current: ArtifactReference;
  try {
    current = artifactForProjectFile(projectRoot, path, kind);
  } catch {
    invalidTask370();
  }
  if (!artifactReferencesEqual(artifact, current)) {
    invalidTask370();
  }
  return current;
}

function assertOptionalCurrentArtifactReference(
  projectRoot: string,
  path: unknown,
  artifact: unknown,
  kind: string
): ArtifactReference | null {
  if (path === null && artifact === null) {
    return null;
  }
  return assertCurrentArtifactReference(projectRoot, path, artifact, kind);
}

function idFromArtifactPath(path: string): string | null {
  const parts = normalizeRelativePath(path).split("/");
  return parts.length >= 2 ? (parts.at(-2) ?? null) : null;
}

function assertArtifactIdMatchesPath(id: unknown, path: unknown, artifact: unknown): void {
  if (typeof id !== "string" || typeof path !== "string" || !isArtifactReference(artifact) || idFromArtifactPath(path) !== id) {
    invalidTask370();
  }
}

function parseTask370(bytes: Buffer): JsonRecord {
  try {
    return JSON.parse(bytes.toString("utf8")) as JsonRecord;
  } catch {
    invalidTask370();
  }
}

function sanitizeBlockerReason(value: string, source: "task370" | "delegated"): string {
  const trimmed = value.trim();
  const sanitized = sanitizeActor(trimmed);
  if (sanitized !== trimmed || !/^[A-Za-z0-9_.:-]{1,240}$/u.test(trimmed)) {
    return source === "task370" ? "task370_blocker_reason_redacted" : "delegated_blocker_reason_redacted";
  }
  return trimmed;
}

function sanitizeBlockerReasons(values: string[], source: "task370" | "delegated"): string[] {
  return values.map((value) => sanitizeBlockerReason(value, source));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function callerProofOrGaMaterialPresent(input: Record<string, unknown>): boolean {
  const text = JSON.stringify(input);
  return /lean_kernel_clean_replay|clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|kernel_checked|proof_success|GA certified|can_certify_ga|can_promote_claim|proof_breadth_closure_json|final_ga_audit_json/iu.test(
    text
  );
}

function readTask370Artifact(
  projectRoot: string,
  projectId: string,
  followThroughId: string,
  followThroughPath: string,
  expectedSha256: string
): {
  body: JsonRecord;
  artifact: ArtifactReference;
  refs: {
    task368: ArtifactReference;
    task367: ArtifactReference;
    delegatedTask364: ArtifactReference | null;
  };
  blockerReasons: string[];
} {
  const absolutePath = assertPathAllowed(projectRoot, followThroughPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up Task370 artifact is missing", {
      statusCode: 404,
      code: errorCode("TASK370_MISSING")
    });
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up Task370 artifact is stale", {
      statusCode: 409,
      code: errorCode("STALE_TASK370")
    });
  }
  const body = parseTask370(bytes);
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id !==
      followThroughId ||
    normalizeRelativePath(
      String(
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path ??
          ""
      )
    ) !== followThroughPath ||
    body.proof_breadth_complete !== false ||
    body.final_ga_audit_unblocked !== false ||
    body.runs_lean !== false ||
    body.executes_proofs !== false ||
    body.accepts_caller_success_metadata !== false ||
    body.accepts_caller_proof_material !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    invalidTask370();
  }

  const task368 = assertCurrentArtifactReference(
    projectRoot,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact,
    TASK368_KIND
  );
  assertArtifactIdMatchesPath(
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    task368.path,
    task368
  );

  const task367 = assertCurrentArtifactReference(
    projectRoot,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
    TASK367_KIND
  );
  assertArtifactIdMatchesPath(
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    task367.path,
    task367
  );

  const delegatedTask364 = assertOptionalCurrentArtifactReference(
    projectRoot,
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path,
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact,
    TASK364_KIND
  );
  if (delegatedTask364) {
    assertArtifactIdMatchesPath(
      body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
      delegatedTask364.path,
      delegatedTask364
    );
  } else if (
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id !==
    null
  ) {
    invalidTask370();
  }

  return {
    body,
    artifact: { kind: TASK370_KIND, path: followThroughPath, sha256: actualSha256, size_bytes: statSync(absolutePath).size },
    refs: { task368, task367, delegatedTask364 },
    blockerReasons: sanitizeBlockerReasons(assertStringArray(body.blocker_reasons), "task370")
  };
}

function artifactForDelegatedTask365(
  projectRoot: string,
  delegated: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp
): ArtifactReference {
  return artifactForProjectFile(
    projectRoot,
    delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path,
    TASK365_KIND
  );
}

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUpInput &
    Record<string, unknown>
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp {
  const projectId = assertSafeId(input.project_id, "project_id");
  const followUpId = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id ??
      `G3-T371-${shortIdSuffix(projectId)}-${Date.now().toString(36).toUpperCase()}`,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id"
  );
  const task370Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id"
  );
  const task370Sha256 = assertSha256(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_sha256
  );
  const task370RelativePath = assertTask370InputPath(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path,
    task370Id
  );
  if (
    input.requested_follow_up_mode !== undefined &&
    input.requested_follow_up_mode !==
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up"
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up mode is invalid", {
      statusCode: 400,
      code: errorCode("INVALID_MODE")
    });
  }
  const outputPath = followUpPath(followUpId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath)) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up already exists", {
      statusCode: 409,
      code: errorCode("ALREADY_EXISTS")
    });
  }

  const task370 = readTask370Artifact(projectRoot, projectId, task370Id, task370RelativePath, task370Sha256);
  const actor = sanitizeActor(input.actor);
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  let delegated: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp | null =
    null;
  if (task370.refs.delegatedTask364) {
    const delegatedId = `G3-T371-T365-${shortIdSuffix(followUpId)}`;
    delegated =
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
            delegatedId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
            task370.body
              .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
            task370.refs.delegatedTask364.path,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_sha256:
            task370.refs.delegatedTask364.sha256,
          actor,
          requested_follow_up_mode:
            "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up"
        }
      );
    if (
      delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id !==
        task370.body
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id ||
      normalizeRelativePath(
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path
      ) !== task370.refs.delegatedTask364.path ||
      !artifactReferencesEqual(
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact,
        task370.refs.delegatedTask364
      )
    ) {
      throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up delegated Task365 material is inconsistent", {
        statusCode: 409,
        code: errorCode("TASK365_DELEGATED_MISMATCH")
      });
    }
  }

  const delegatedArtifact = delegated ? artifactForDelegatedTask365(projectRoot, delegated) : null;
  const blockerReasons = uniqueStrings([
    ...task370.blockerReasons,
    ...(delegated ? sanitizeBlockerReasons(delegated.blocker_reasons, "delegated") : ["task370_not_ready_for_packaging_results_follow_up"]),
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);
  const body = {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
      followUpId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: delegated?.ok ?? false,
    follow_up_status: delegated
      ? delegated.ok
        ? "next_closure_execution_packaging_results_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck"
        : "blocked_next_closure_execution_packaging_results_selected_tranche_packaging_results_incomplete"
      : "blocked_next_closure_execution_packaging_results_closure_execution_packaging_not_ready_for_packaging_results_follow_up",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
      outputPath,
    requested_follow_up_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      task370Id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      task370RelativePath,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
      task370.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task370.body
        .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task370.refs.task368.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task370.refs.task368,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task370.body
        .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task370.refs.task367.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task370.refs.task367,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      task370.body
        .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      task370.refs.delegatedTask364?.path ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
      task370.refs.delegatedTask364,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
      delegated?.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
      delegated?.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact:
      delegatedArtifact,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact ??
      null,
    selected_task_count: delegated?.selected_task_count ?? 0,
    verified_selected_task_count: delegated?.verified_selected_task_count ?? 0,
    missing_selected_task_count: delegated?.missing_selected_task_count ?? 0,
    blocked_selected_task_count: delegated?.blocked_selected_task_count ?? 0,
    selected_task_ids: delegated?.selected_task_ids ?? [],
    verified_selected_task_ids: delegated?.verified_selected_task_ids ?? [],
    missing_selected_task_ids: delegated?.missing_selected_task_ids ?? [],
    blocked_selected_task_ids: delegated?.blocked_selected_task_ids ?? [],
    selected_packaging_report_artifacts: delegated?.selected_packaging_report_artifacts ?? [],
    selected_packaging_report_artifacts_current: delegated?.selected_packaging_report_artifacts_current ?? false,
    ready_for_proof_breadth_closure_recheck: delegated?.ready_for_proof_breadth_closure_recheck ?? false,
    blocker_reasons: blockerReasons,
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
  } as JsonRecord;

  const text = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, text, "utf8");
  const result =
    {
      ...body,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact:
        {
          kind: TASK371_KIND,
          path: outputPath,
          sha256: sha256Text(text),
          size_bytes: Buffer.byteLength(text, "utf8")
        }
    } as Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp;

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type:
      "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
        followUpId,
      follow_up_status: result.follow_up_status,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
        outputPath,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact_sha256:
        result
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact
          .sha256,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        task370Id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact_sha256:
        task370.artifact.sha256,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact_sha256:
        result
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact
          ?.sha256 ?? null,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
        result
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact_sha256:
        result
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact
          ?.sha256 ?? null,
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
