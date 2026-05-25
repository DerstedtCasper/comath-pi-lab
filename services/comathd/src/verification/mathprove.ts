import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { importArtifact } from "../artifacts/store.js";
import { getClaim } from "../claim/claim-store.js";
import { ComathError } from "../errors.js";
import { appendEvidenceRecord } from "../evidence/store.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { type ArtifactRef, type ClaimStatus, type Evidence } from "../types/schemas.js";
import { nextSequentialId } from "../utils/id.js";
import { promoteClaim, type ClaimPromotionDecision } from "./gate.js";

const execFileAsync = promisify(execFile);

export type MathProveBridgeMode = "plan" | "route" | "final_audit";

export type MathProveGateResult = "passed" | "failed";

export type MathProveBridgeResult = {
  ok: boolean;
  bridge_version: "phase9-mock";
  mode: MathProveBridgeMode;
  claim_id: string;
  target_status: ClaimStatus;
  gate_result: MathProveGateResult;
  evidence: unknown[];
  artifacts: unknown[];
  vetoes: string[];
  warnings: string[];
};

export type MathProveBridgeRequest = {
  project_id: string;
  claim_id: string;
  mode: MathProveBridgeMode;
  target_status: ClaimStatus;
  actor: string;
};

export type MathProveBridgeRun = {
  result: MathProveBridgeResult;
  artifact: ArtifactRef;
  evidence: Evidence;
  report_path: string;
};

export type MathProvePromotionDecision = ClaimPromotionDecision & {
  bridge: MathProveBridgeRun;
};

function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
}

function bridgeScriptPath(): string {
  return join(repoRoot(), "python", "mathprove_bridge.py");
}

function bridgeReportDir(projectRoot: string, claimId: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "evidence", claimId, "mathprove"), {
    purpose: "runtime-write"
  });
}

function readBridgeReportIds(projectRoot: string, claimId: string): string[] {
  const dir = bridgeReportDir(projectRoot, claimId);
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((name) => /^MPBR-\d{4,}\.json$/.test(name))
    .map((name) => name.slice(0, -".json".length));
}

function bridgeReportPath(projectRoot: string, claimId: string, existingIds: readonly string[]): { id: string; path: string } {
  const id = nextSequentialId("MPBR", existingIds);
  return {
    id,
    path: assertPathAllowed(projectRoot, join(".comath", "evidence", claimId, "mathprove", `${id}.json`), {
      purpose: "runtime-write"
    })
  };
}

function ensureStringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function validateBridgeShape(value: unknown): MathProveBridgeResult {
  if (!value || typeof value !== "object") {
    throw new ComathError("invalid MathProve bridge result", { code: "MATHPROVE_RESULT_INVALID" });
  }
  const record = value as Record<string, unknown>;
  const mode = record.mode;
  const targetStatus = record.target_status;
  if (!["plan", "route", "final_audit"].includes(String(mode))) {
    throw new ComathError("invalid MathProve bridge result: unknown mode", { code: "MATHPROVE_RESULT_INVALID" });
  }
  if (!["passed", "failed"].includes(String(record.gate_result))) {
    throw new ComathError("invalid MathProve bridge result: unknown gate_result", { code: "MATHPROVE_RESULT_INVALID" });
  }
  if (typeof record.ok !== "boolean" || typeof record.claim_id !== "string" || typeof targetStatus !== "string") {
    throw new ComathError("invalid MathProve bridge result: missing required fields", {
      code: "MATHPROVE_RESULT_INVALID"
    });
  }
  if (!Array.isArray(record.evidence) || !Array.isArray(record.artifacts)) {
    throw new ComathError("invalid MathProve bridge result: evidence/artifacts must be arrays", {
      code: "MATHPROVE_RESULT_INVALID"
    });
  }
  if (record.bridge_version !== "phase9-mock") {
    throw new ComathError("invalid MathProve bridge result: unknown bridge_version", {
      code: "MATHPROVE_RESULT_INVALID"
    });
  }

  return {
    ok: record.ok,
    bridge_version: record.bridge_version,
    mode: mode as MathProveBridgeMode,
    claim_id: record.claim_id,
    target_status: targetStatus as ClaimStatus,
    gate_result: record.gate_result as MathProveGateResult,
    evidence: record.evidence,
    artifacts: record.artifacts,
    vetoes: ensureStringArray(record.vetoes),
    warnings: ensureStringArray(record.warnings)
  };
}

export function parseMathProveBridgeResult(
  stdout: string,
  expected: Pick<MathProveBridgeRequest, "claim_id" | "mode" | "target_status">
): MathProveBridgeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new ComathError("invalid MathProve bridge JSON", {
      code: "MATHPROVE_JSON_INVALID"
    });
  }

  const result = validateBridgeShape(parsed);
  if (result.claim_id !== expected.claim_id) {
    throw new ComathError("MathProve bridge claim mismatch", { code: "MATHPROVE_CLAIM_MISMATCH" });
  }
  if (result.mode !== expected.mode) {
    throw new ComathError("MathProve bridge mode mismatch", { code: "MATHPROVE_MODE_MISMATCH" });
  }
  if (result.target_status !== expected.target_status) {
    throw new ComathError("MathProve bridge target status mismatch", { code: "MATHPROVE_TARGET_MISMATCH" });
  }
  if (result.ok || result.gate_result !== "failed") {
    throw new ComathError("Phase 9 MathProve bridge must fail closed", { code: "MATHPROVE_PHASE9_NOT_FAIL_CLOSED" });
  }
  return result;
}

async function executeBridge(projectRoot: string, request: MathProveBridgeRequest): Promise<MathProveBridgeResult> {
  const scriptPath = bridgeScriptPath();
  const { stdout } = await execFileAsync(
    "python",
    [
      scriptPath,
      "--project-root",
      projectRoot,
      "--claim",
      request.claim_id,
      "--mode",
      request.mode,
      "--target-status",
      request.target_status
    ],
    {
      cwd: repoRoot(),
      encoding: "utf8",
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: 1024 * 1024
    }
  );
  return parseMathProveBridgeResult(stdout, request);
}

export async function runMathProveBridgeMock(
  projectRoot: string,
  request: MathProveBridgeRequest
): Promise<MathProveBridgeRun> {
  const claim = getClaim(projectRoot, request.project_id, request.claim_id);
  if (!claim) {
    throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }

  const report = bridgeReportPath(projectRoot, request.claim_id, readBridgeReportIds(projectRoot, request.claim_id));
  const result = await executeBridge(projectRoot, request);
  mkdirSync(dirname(report.path), { recursive: true });
  writeFileSync(
    report.path,
    `${JSON.stringify(
      {
        id: report.id,
        project_id: request.project_id,
        claim_id: request.claim_id,
        mode: request.mode,
        target_status: request.target_status,
        bridge: "mathprove",
        result
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const artifact = await importArtifact({
    projectRoot,
    project_id: request.project_id,
    source_path: report.path,
    kind: "runner_output",
    actor: request.actor
  });
  const evidence = appendEvidenceRecord(projectRoot, {
    project_id: request.project_id,
    claim_id: request.claim_id,
    kind: "audit",
    summary: `MathProve ${request.mode} mock failed closed for ${request.target_status}`,
    artifact_ids: [artifact.id]
  });
  appendAuditEvent(projectRoot, {
    project_id: request.project_id,
    event_type: "mathprove.bridge_ran",
    actor: request.actor,
    target_id: request.claim_id,
    payload: {
      mode: request.mode,
      target_status: request.target_status,
      ok: result.ok,
      gate_result: result.gate_result,
      vetoes: result.vetoes,
      warnings: result.warnings,
      report_id: report.id,
      artifact_id: artifact.id,
      evidence_id: evidence.id
    }
  });

  return {
    result,
    artifact,
    evidence,
    report_path: report.path
  };
}

export async function promoteClaimWithMathProveBridge(
  projectRoot: string,
  request: MathProveBridgeRequest & { evidence_ids: string[]; artifact_ids: string[] }
): Promise<MathProvePromotionDecision> {
  const bridge = await runMathProveBridgeMock(projectRoot, request);
  const promotion = promoteClaim(projectRoot, {
    project_id: request.project_id,
    claim_id: request.claim_id,
    target_status: request.target_status,
    actor: request.actor,
    evidence_ids: [...request.evidence_ids, bridge.evidence.id],
    artifact_ids: [...request.artifact_ids, bridge.artifact.id],
    external_vetoes: bridge.result.vetoes,
    external_warnings: bridge.result.warnings
  });
  return {
    ...promotion,
    bridge
  };
}
