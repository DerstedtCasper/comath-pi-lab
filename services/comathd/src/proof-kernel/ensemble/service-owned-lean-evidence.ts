import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { assertPathAllowed } from "../../security/path-policy.js";
import {
  hasFinalReplayRegistryProvenanceV3,
  hasLeanLakeBinaryHashProvenanceV3,
  verifyFinalReplayManifestV3
} from "../lean/final-replay-manifest-v3.js";
import { hasLeanRunManifestProvenanceIndexV1, verifyLeanRunManifestV3Evidence } from "../lean/lean-run-manifest-v3.js";

export type ServiceOwnedLeanEvidenceContext = {
  projectRoot: string;
  campaignId: string;
  claimId: string;
  candidateId?: string;
  evidence: string[];
};

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function parseEvidencePath(raw: string): { path: string; expectedHash?: string } | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  const prefixed = /^(lean_run_manifest|final_replay_manifest):(.+)$/i.exec(trimmed);
  const candidate = prefixed ? prefixed[2]!.trim() : trimmed;
  if (!prefixed && !/lean_run_manifest|final_replay_manifest/i.test(candidate)) {
    return undefined;
  }
  const [path, expectedHash] = candidate.split("#", 2);
  if (!path || !/\.json$/i.test(path.trim())) {
    return undefined;
  }
  return {
    path: path.trim(),
    expectedHash: expectedHash && /^[0-9a-f]{64}$/i.test(expectedHash) ? expectedHash.toLowerCase() : undefined
  };
}

function parseEquivalenceEvidencePath(raw: string): { path: string; expectedHash?: string } | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  const prefixed =
    /^(lean_equivalence_replay|lean_equivalence_run_manifest|equivalence_lean_run_manifest|equivalence_final_replay_manifest):(.+)$/i.exec(
      trimmed
    );
  const candidate = prefixed ? prefixed[2]!.trim() : trimmed;
  if (!/equivalence/i.test(prefixed?.[1] ?? candidate)) {
    return undefined;
  }
  if (!/lean_run_manifest|final_replay_manifest/i.test(candidate)) {
    return undefined;
  }
  const [path, expectedHash] = candidate.split("#", 2);
  if (!path || !/\.json$/i.test(path.trim())) {
    return undefined;
  }
  return {
    path: path.trim(),
    expectedHash: expectedHash && /^[0-9a-f]{64}$/i.test(expectedHash) ? expectedHash.toLowerCase() : undefined
  };
}

function readEvidenceJson(input: {
  projectRoot: string;
  path: string;
  expectedHash?: string;
}): unknown | undefined {
  try {
    const absolute = assertPathAllowed(input.projectRoot, input.path, { purpose: "read", resolveRealpath: true });
    const text = readFileSync(absolute, "utf8");
    if (input.expectedHash && sha256Text(text) !== input.expectedHash) {
      return undefined;
    }
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function isVerifiedLeanRunManifest(input: {
  projectRoot: string;
  campaignId: string;
  claimId: string;
  candidateId?: string;
  manifest: unknown;
  manifestPath: string;
}): boolean {
  const manifest = record(input.manifest);
  if (!manifest || manifest.schema_version !== "comath.lean_run_manifest.v3") {
    return false;
  }
  if (
    manifest.campaign_id !== input.campaignId ||
    manifest.claim_id !== input.claimId ||
    (input.candidateId && manifest.candidate_id !== input.candidateId) ||
    manifest.runner !== "comathd.LeanRunner" ||
    manifest.exit_code !== 0 ||
    manifest.proof_authority !== "lean_kernel_check"
  ) {
    return false;
  }
  return (
    verifyLeanRunManifestV3Evidence(input.projectRoot, input.manifest).ok &&
    hasLeanRunManifestProvenanceIndexV1({
      projectRoot: input.projectRoot,
      manifest: input.manifest,
      manifest_path: input.manifestPath
    })
  );
}

function isVerifiedFinalReplayManifest(input: {
  projectRoot: string;
  campaignId: string;
  claimId: string;
  manifest: unknown;
}): boolean {
  const manifest = record(input.manifest);
  if (!manifest || manifest.schema_version !== "comath.final_replay_manifest.v3") {
    return false;
  }
  if (
    manifest.campaign_id !== input.campaignId ||
    manifest.claim_id !== input.claimId ||
    manifest.runner !== "comathd.LeanAuthority" ||
    manifest.result !== "pass"
  ) {
    return false;
  }
  return (
    verifyFinalReplayManifestV3(input.projectRoot, input.manifest).ok &&
    hasFinalReplayRegistryProvenanceV3(input.projectRoot, input.manifest) &&
    hasLeanLakeBinaryHashProvenanceV3(input.projectRoot, input.manifest)
  );
}

export function hasVerifiedServiceOwnedLeanManifestEvidence(input: ServiceOwnedLeanEvidenceContext): boolean {
  return input.evidence.some((evidence) => {
    const ref = parseEvidencePath(evidence);
    if (!ref) {
      return false;
    }
    const manifest = readEvidenceJson({ projectRoot: input.projectRoot, path: ref.path, expectedHash: ref.expectedHash });
    return (
      isVerifiedLeanRunManifest({
        projectRoot: input.projectRoot,
        campaignId: input.campaignId,
        claimId: input.claimId,
        candidateId: input.candidateId,
        manifest,
        manifestPath: ref.path
      }) ||
      isVerifiedFinalReplayManifest({
        projectRoot: input.projectRoot,
        campaignId: input.campaignId,
        claimId: input.claimId,
        manifest
      })
    );
  });
}

export function hasVerifiedServiceOwnedLeanEquivalenceEvidence(input: ServiceOwnedLeanEvidenceContext): boolean {
  return input.evidence.some((evidence) => {
    const ref = parseEquivalenceEvidencePath(evidence);
    if (!ref) {
      return false;
    }
    const manifest = readEvidenceJson({ projectRoot: input.projectRoot, path: ref.path, expectedHash: ref.expectedHash });
    return (
      isVerifiedLeanRunManifest({
        projectRoot: input.projectRoot,
        campaignId: input.campaignId,
        claimId: input.claimId,
        candidateId: input.candidateId,
        manifest,
        manifestPath: ref.path
      }) ||
      isVerifiedFinalReplayManifest({
        projectRoot: input.projectRoot,
        campaignId: input.campaignId,
        claimId: input.claimId,
        manifest
      })
    );
  });
}
