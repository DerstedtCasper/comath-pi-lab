import { createHash } from "node:crypto";
import type { ProjectRuntime } from "../../research/project-runtime.js";
import { readCommittedFile } from "../../research/project-commit.js";
import { getCampaign } from "./research-campaign.js";
import { verifyScopedFinalAuthorityPackagingV1 } from "../lean/clean-replay-async.js";
import type { FormalCandidateSubmissionReceipt } from "../../research/formal-candidate-intake.js";

type RequestedDependency = { artifact_id: string; sha256: string };
type IntegratedLemma = {
  obligation_id: string;
  claim_id: string;
  source: { relative_path: string; artifact_id: string; sha256: string; bytes: string | Buffer };
  scoped_packaging?: { result: "pass"; proof_authority: "lean_kernel_clean_replay"; can_promote_claim: false; promotion_requires_gate: true };
};

function digest(bytes: string | Buffer) { return createHash("sha256").update(bytes).digest("hex"); }
function fail(code: string): never { throw new Error(code); }

/**
 * Selects exact already-integrated lemma bytes for a root project. A worker's
 * artifact pointer is only a selector: kernel replay packaging is mandatory.
 */
export function collectIntegratedLemmaMaterial(input: {
  requested_dependencies: RequestedDependency[];
  integrated: IntegratedLemma[];
  /** When materializing a root, only its approved direct PO dependencies may satisfy a CAS selector. */
  required_obligation_ids?: readonly string[];
}): { obligation_id: string; claim_id: string; relative_path: string; sha256: string; bytes: Buffer }[] {
  const allowed = input.required_obligation_ids === undefined ? input.integrated
    : input.integrated.filter(item => input.required_obligation_ids!.includes(item.obligation_id));
  const selected = input.requested_dependencies.map(requested => {
    const matches = allowed.filter(item => item.source.artifact_id === requested.artifact_id && item.source.sha256 === requested.sha256);
    if (matches.length !== 1) fail("INTEGRATED_LEMMA_MATERIAL_UNRESOLVED");
    const lemma = matches[0];
    if (!lemma.scoped_packaging || lemma.scoped_packaging.result !== "pass" || lemma.scoped_packaging.proof_authority !== "lean_kernel_clean_replay"
      || lemma.scoped_packaging.can_promote_claim !== false || lemma.scoped_packaging.promotion_requires_gate !== true) fail("INTEGRATED_LEMMA_PACKAGING_REQUIRED");
    const bytes = Buffer.isBuffer(lemma.source.bytes) ? lemma.source.bytes : Buffer.from(lemma.source.bytes);
    if (digest(bytes) !== lemma.source.sha256 || bytes.length === 0 || !lemma.source.relative_path.endsWith(".lean") || lemma.source.relative_path.startsWith("/") || lemma.source.relative_path.split("/").some(part => !part || part === "." || part === "..")) fail("INTEGRATED_LEMMA_SOURCE_INVALID");
    return { obligation_id: lemma.obligation_id, claim_id: lemma.claim_id, relative_path: lemma.source.relative_path, sha256: lemma.source.sha256, bytes };
  });
  if (input.required_obligation_ids && input.required_obligation_ids.some(id => !selected.some(item => item.obligation_id === id)))
    fail("INTEGRATED_LEMMA_DEPENDENCY_UNRESOLVED");
  if (new Set(selected.map(item => item.relative_path.toLowerCase())).size !== selected.length) fail("INTEGRATED_LEMMA_SOURCE_COLLISION");
  return selected;
}

/** Resolves predecessor source only from an integrated PO's committed receipt and verified FRTASK package. */
export function collectIntegratedLemmaMaterialFromRuntime(input: {
  runtime: ProjectRuntime;
  campaign_id: string;
  requested_dependencies: RequestedDependency[];
  required_obligation_ids: readonly string[];
  readSubmissionReceipt: (commandId: string) => FormalCandidateSubmissionReceipt | undefined;
}) {
  const campaign = getCampaign(input.runtime.root, input.campaign_id);
  if (!campaign) fail("INTEGRATED_LEMMA_CAMPAIGN_MISSING");
  const required = new Set(input.required_obligation_ids);
  const integrated = campaign.open_obligations.filter(po => po.status === "integrated" && required.has(po.obligation_id)).flatMap(po => {
    const rows = input.runtime.store.all("SELECT response_json FROM commands WHERE principal_id='service:formal-submission' AND json_extract(response_json,'$.obligation_id')=?", po.obligation_id);
    return rows.flatMap(row => {
      const marker = JSON.parse(String(row.response_json)), receipt = input.readSubmissionReceipt(marker.command_id);
      if (!receipt || receipt.commit_state !== "committed" || receipt.scope.claim_id !== po.claim_id) return [];
      const packages = input.runtime.store.all("SELECT plan_json FROM trust_commits WHERE phase='committed' AND campaign_id=?", input.campaign_id).flatMap(commit => {
        const response = JSON.parse(String(commit.plan_json)).response;
        const path = response?.final_authority_packaging?.packaging_path;
        if (typeof path !== "string") return [];
        try { const packaging = JSON.parse(readCommittedFile(input.runtime.root, path)); return verifyScopedFinalAuthorityPackagingV1(input.runtime.root, packaging).ok && packaging.scope?.obligation_id === po.obligation_id ? [packaging] : []; } catch { return []; }
      });
      if (packages.length !== 1) return [];
      return receipt.source_refs.map(source => ({ obligation_id: po.obligation_id, claim_id: po.claim_id,
        source: { relative_path: source.relative_path, artifact_id: source.artifact.artifact_id, sha256: source.artifact.sha256,
          bytes: readCommittedFile(input.runtime.root, `${receipt.workspace_path}/source/${source.relative_path}`) },
        scoped_packaging: { result: "pass" as const, proof_authority: "lean_kernel_clean_replay" as const, can_promote_claim: false as const, promotion_requires_gate: true as const } }));
    });
  });
  return collectIntegratedLemmaMaterial({ requested_dependencies: input.requested_dependencies, integrated, required_obligation_ids: input.required_obligation_ids });
}
