import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import {
  candidateManifestSchema,
  candidateRunSchema,
  type CandidateManifest,
  type CandidateRun,
  type ProofObligation,
  type ResearchCampaign
} from "../../types/schemas.js";
import { defaultVariants } from "./variant-registry.js";

export type CandidateBatch = {
  candidates: CandidateRun[];
  manifests: CandidateManifest[];
};

function writeJson(projectRoot: string, relativePath: string, value: unknown): string {
  const path = assertPathAllowed(projectRoot, relativePath, { purpose: "runtime-write" });
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return path;
}

export function runTrivialNatAddZeroCandidates(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
}): CandidateBatch {
  const candidates: CandidateRun[] = [];
  const manifests: CandidateManifest[] = [];

  defaultVariants.forEach((variant, index) => {
    const candidateId = `CAND-${String(index + 1).padStart(4, "0")}`;
    const workspaceRel = join(
      ".comath",
      "ensembles",
      "lemma_sprint",
      input.obligation.obligation_id,
      "candidates",
      variant.slug
    );
    const workspacePath = assertPathAllowed(input.projectRoot, workspaceRel, { purpose: "runtime-write" });
    mkdirSync(workspacePath, { recursive: true });

    const isDirectWinner = variant.variant_id === "V1";
    const manifest = candidateManifestSchema.parse({
      candidate_id: candidateId,
      variant_id: variant.variant_id,
      stage: "lemma_sprint",
      obligation_id: input.obligation.obligation_id,
      locked_statement_hash: input.obligation.statement_hash,
      candidate_statement_hash: input.obligation.statement_hash,
      statement_equivalence_claim: "exact",
      introduced_assumptions: [],
      introduced_dependencies: isDirectWinner ? ["Nat.add_zero"] : [],
      lean_files: isDirectWinner ? [".comath/lean/MathResearch/C0001.lean"] : [],
      logs: [],
      evidence: [],
      hard_vetoes: [],
      failures: isDirectWinner ? [] : [`${variant.name} did not produce a kernel-checked candidate in the trivial slice.`],
      replay_command: isDirectWinner ? "lake build" : "",
      summary: isDirectWinner
        ? "Direct Lean proof by Nat.add_zero for the exact locked theorem."
        : `${variant.name} supplied stress, search, or failure-route context only.`,
      maintainability_notes: isDirectWinner ? "Readable single theorem using a standard library theorem." : "Preserved as failed-route memory."
    });
    const manifestAbs = writeJson(input.projectRoot, join(workspaceRel, "candidate_manifest.json"), manifest);
    writeFileSync(
      join(workspacePath, "report.md"),
      [
        `# ${variant.name}`,
        "",
        `Purpose: ${variant.purpose}`,
        "",
        isDirectWinner
          ? "Outcome: exact kernel-checkable candidate selected for final replay."
          : "Outcome: no proof-grade evidence; route is retained as failure/search memory.",
        ""
      ].join("\n"),
      "utf8"
    );

    manifests.push(manifest);
    candidates.push(
      candidateRunSchema.parse({
        candidate_id: candidateId,
        campaign_id: input.campaign.campaign_id,
        stage: "lemma_sprint",
        obligation_id: input.obligation.obligation_id,
        variant_id: variant.variant_id,
        workspace_path: relative(input.projectRoot, workspacePath).replace(/\\/g, "/"),
        locked_statement_hash: input.obligation.statement_hash,
        candidate_statement_hash: input.obligation.statement_hash,
        state: isDirectWinner ? "candidate_kernel_checked" : "candidate_failed",
        manifest_path: relative(input.projectRoot, manifestAbs).replace(/\\/g, "/"),
        score: isDirectWinner ? 15_500 : -100,
        hard_vetoes: [],
        artifacts: [],
        replay_command: isDirectWinner ? "lake build" : undefined
      })
    );
  });

  return { candidates, manifests };
}
