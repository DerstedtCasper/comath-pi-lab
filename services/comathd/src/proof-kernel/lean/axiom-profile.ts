import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import { sha256FileSync } from "./lean-project.js";

export type AxiomProfileReport = {
  result: "pass" | "fail";
  theorem_name: string;
  raw_output: string;
  trust_profile: LeanTrustProfile;
  allowed_axioms: string[];
  detected_axioms: string[];
  hard_vetoes: string[];
};

export type LeanTrustProfile = {
  profile_id: string;
  allowed_axioms: string[];
  require_print_axioms: boolean;
};

export type StructuredLeanAuditV3Like = {
  schema_version?: string;
  theorem_name?: string;
  fully_qualified_name?: string;
  theorem_type_pretty?: string;
  theorem_type_elaborated_hash?: string;
  source_file?: string;
  source_file_sha256?: string;
  imports?: string[];
  axiom_profile?: string[];
  environment_fingerprint?: string;
  generated_by_run_id?: string;
  result?: string;
  hard_vetoes?: string[];
};

export type AxiomProfileV2Report = {
  schema_version: "comath.axiom_profile.v2";
  result: "pass" | "fail";
  theorem_name: string;
  theorem_type_hash: string;
  source_hash: string;
  environment_fingerprint: string;
  generated_by_run_id: string;
  lean_run_manifest_id: string;
  structured_audit_bound: boolean;
  detected_axioms: string[];
  raw_stdout_detected_axioms: string[];
  trust_profile: LeanTrustProfile;
  allowed_axioms: string[];
  hard_vetoes: string[];
};

const defaultTrustProfile: LeanTrustProfile = {
  profile_id: "ordinary_classical",
  allowed_axioms: ["propext", "Quot.sound", "Classical.choice"],
  require_print_axioms: true
};

function extractDetectedAxioms(rawOutput: string, theoremName: string): string[] {
  if (rawOutput.includes("does not depend on any axioms")) {
    return [];
  }
  const bracketMatch = rawOutput.match(/\[(?<axioms>[^\]]*)\]/);
  const tokens = bracketMatch?.groups?.axioms
    ? bracketMatch.groups.axioms.split(/[,;\s]+/)
    : rawOutput.split(/\r?\n/).flatMap((line) => line.split(/[:,\s]+/));
  const ignored = new Set(["", theoremName, "depends", "on", "axioms", "axiom", "uses", "by"]);
  return tokens
    .map((token) => token.trim().replace(/^['"`]+|['"`.,;:]+$/g, ""))
    .filter((token) => token && !ignored.has(token))
    .filter((token) => /^[A-Za-z_][A-Za-z0-9_'.]*(?:\.[A-Za-z_][A-Za-z0-9_'.]*)*$/.test(token))
    .filter((token, index, all) => all.indexOf(token) === index);
}

function hasTargetAxiomReport(rawOutput: string, theoremName: string): boolean {
  const escapedTheorem = theoremName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escapedTheorem}[^\\n]*(?:does not depend on any axioms|depends on axioms)`).test(rawOutput);
}

export function checkAxiomProfile(input: {
  projectRoot: string;
  reportPath: string;
  theorem_name: string;
  raw_output: string;
  trust_profile?: Partial<LeanTrustProfile>;
}): AxiomProfileReport {
  const trust_profile: LeanTrustProfile = {
    ...defaultTrustProfile,
    ...input.trust_profile,
    allowed_axioms: input.trust_profile?.allowed_axioms ?? defaultTrustProfile.allowed_axioms
  };
  const allowed = new Set(trust_profile.allowed_axioms);
  const detected_axioms = extractDetectedAxioms(input.raw_output, input.theorem_name);
  const unauthorized = detected_axioms.filter((axiom) => !allowed.has(axiom));
  const missingTargetAxiomReport =
    trust_profile.require_print_axioms && !hasTargetAxiomReport(input.raw_output, input.theorem_name);
  const hard_vetoes = [
    ...unauthorized.map((axiom) => `unauthorized_axiom:${axiom}`),
    ...(missingTargetAxiomReport ? ["missing_target_axiom_report"] : [])
  ];
  const report: AxiomProfileReport = {
    result: hard_vetoes.length === 0 ? "pass" : "fail",
    theorem_name: input.theorem_name,
    raw_output: input.raw_output,
    trust_profile,
    allowed_axioms: [...allowed],
    detected_axioms,
    hard_vetoes
  };
  const path = assertPathAllowed(input.projectRoot, input.reportPath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

export function checkAxiomProfileV2(input: {
  projectRoot: string;
  reportPath: string;
  theoremName: string;
  theoremTypeHash: string;
  sourceFile: string;
  environmentFingerprint: string;
  leanRunManifestId: string;
  structuredAudit?: StructuredLeanAuditV3Like | null;
  rawOutput?: string;
  trustProfile?: Partial<LeanTrustProfile>;
}): AxiomProfileV2Report {
  const trust_profile: LeanTrustProfile = {
    ...defaultTrustProfile,
    ...input.trustProfile,
    allowed_axioms: input.trustProfile?.allowed_axioms ?? defaultTrustProfile.allowed_axioms
  };
  const source_hash = sha256FileSync(input.sourceFile).sha256;
  const rawAxioms = input.rawOutput ? extractDetectedAxioms(input.rawOutput, input.theoremName) : [];
  const structuredAxioms = input.structuredAudit?.axiom_profile ?? [];
  const detected_axioms = Array.from(new Set(structuredAxioms)).sort();
  const allowed = new Set(trust_profile.allowed_axioms);
  const unauthorized = detected_axioms.filter((axiom) => !allowed.has(axiom));
  const hard_vetoes = [
    ...unauthorized.map((axiom) => `unauthorized_axiom:${axiom}`),
    ...(!input.structuredAudit ? ["missing_structured_lean_audit"] : []),
    ...(input.structuredAudit && input.structuredAudit.result !== "pass" ? ["structured_lean_audit_failed"] : []),
    ...(input.structuredAudit?.fully_qualified_name && input.structuredAudit.fully_qualified_name !== input.theoremName
      ? ["axiom_profile_target_mismatch"]
      : []),
    ...(input.structuredAudit?.theorem_type_elaborated_hash && input.structuredAudit.theorem_type_elaborated_hash !== input.theoremTypeHash
      ? ["axiom_profile_type_hash_mismatch"]
      : []),
    ...(input.structuredAudit?.source_file_sha256 && input.structuredAudit.source_file_sha256 !== source_hash
      ? ["axiom_profile_source_hash_mismatch"]
      : []),
    ...(input.structuredAudit?.environment_fingerprint &&
    input.structuredAudit.environment_fingerprint !== input.environmentFingerprint
      ? ["axiom_profile_environment_fingerprint_mismatch"]
      : []),
    ...(input.structuredAudit?.generated_by_run_id && input.structuredAudit.generated_by_run_id !== input.leanRunManifestId
      ? ["axiom_profile_lean_run_manifest_mismatch"]
      : []),
    ...((input.structuredAudit?.hard_vetoes ?? []).map((veto) => `structured_audit:${veto}`))
  ];

  if (input.rawOutput && input.structuredAudit) {
    const rawSet = new Set(rawAxioms);
    const structuredSet = new Set(detected_axioms);
    const mismatch = rawAxioms.some((axiom) => !structuredSet.has(axiom)) || detected_axioms.some((axiom) => !rawSet.has(axiom));
    if (mismatch) {
      hard_vetoes.push("raw_stdout_axiom_spoof_mismatch");
    }
  }

  const report: AxiomProfileV2Report = {
    schema_version: "comath.axiom_profile.v2",
    result: hard_vetoes.length === 0 ? "pass" : "fail",
    theorem_name: input.theoremName,
    theorem_type_hash: input.theoremTypeHash,
    source_hash,
    environment_fingerprint: input.environmentFingerprint,
    generated_by_run_id: input.structuredAudit?.generated_by_run_id ?? input.leanRunManifestId,
    lean_run_manifest_id: input.leanRunManifestId,
    structured_audit_bound: Boolean(input.structuredAudit),
    detected_axioms,
    raw_stdout_detected_axioms: rawAxioms,
    trust_profile,
    allowed_axioms: [...allowed],
    hard_vetoes: Array.from(new Set(hard_vetoes))
  };
  const path = assertPathAllowed(input.projectRoot, input.reportPath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

export function verifyAxiomProfileV2Evidence(input: {
  theoremName: string;
  theoremTypeHash: string;
  sourceHash: string;
  environmentFingerprint: string;
  leanRunManifestId: string;
  profile: unknown;
}): { ok: boolean; vetoes: string[] } {
  const profile = input.profile as Partial<AxiomProfileV2Report> | null;
  const vetoes: string[] = [];
  if (!profile || profile.schema_version !== "comath.axiom_profile.v2") {
    vetoes.push("axiom_profile_v2_missing");
    return { ok: false, vetoes };
  }
  if (profile.theorem_name !== input.theoremName) {
    vetoes.push("axiom_profile_target_mismatch");
  }
  if (profile.theorem_type_hash !== input.theoremTypeHash) {
    vetoes.push("axiom_profile_type_hash_mismatch");
  }
  if (profile.source_hash !== input.sourceHash) {
    vetoes.push("axiom_profile_source_hash_mismatch");
  }
  if (profile.environment_fingerprint !== input.environmentFingerprint) {
    vetoes.push("axiom_profile_environment_fingerprint_mismatch");
  }
  if (profile.lean_run_manifest_id !== input.leanRunManifestId) {
    vetoes.push("axiom_profile_lean_run_manifest_mismatch");
  }
  if (!profile.structured_audit_bound) {
    vetoes.push("missing_structured_lean_audit");
  }
  vetoes.push(...(profile.hard_vetoes ?? []));
  return { ok: vetoes.length === 0, vetoes: Array.from(new Set(vetoes)) };
}
