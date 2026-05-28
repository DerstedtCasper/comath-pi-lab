import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import { candidateManifestSchema, type CandidateManifest, type CandidateRun, type ProofObligation, type ResearchCampaign } from "../../types/schemas.js";

export type FailureAggregate = {
  aggregate_id: string;
  type: "FailureRouteAggregate";
  campaign_id: string;
  stage: CandidateRun["stage"];
  obligation_id: string;
  selected_candidate_id: string | null;
  total_candidates: number;
  total_failed_routes: number;
  failed_candidate_ids: string[];
  failure_clusters: Array<{
    cluster_id: string;
    reason: string;
    candidate_ids: string[];
    variant_ids: string[];
  }>;
  hard_vetoes: string[];
  recommendations: string[];
  proof_authority: "none";
  event_log_path: string;
  aggregate_path: string;
  created_at: string;
};

export type ProofMemoryFailureRoute = {
  type: "FailureRoute";
  campaign_id: string;
  candidate_id: string;
  stage: CandidateRun["stage"];
  obligation_id: string;
  variant_id: CandidateRun["variant_id"];
  state: CandidateRun["state"];
  status: "active" | "superseded" | "retracted";
  reason: string;
  locked_statement_hash: string;
  candidate_statement_hash: string | null;
  theorem_family: string | null;
  canonical_proposition: string | null;
  primary_dependency: string | null;
  route_keys: string[];
  manifest_path: string | null;
  artifact_paths: string[];
  counterexamples: string[];
  blockers: string[];
  repairs: string[];
  hard_vetoes: string[];
  superseded_by: string | null;
  final_handoff_capsule_path: string | null;
  proof_authority: "none";
  created_at: string;
};

export type ProofMemoryRetrievalWarning = {
  code: "stale_fact" | "superseded_fact" | "unresolved_blocker";
  candidate_id: string;
  message: string;
};

export type ProofMemoryRetrieval = {
  matches: ProofMemoryFailureRoute[];
  warnings: ProofMemoryRetrievalWarning[];
  warning_log_path: string;
};

function proofMemoryEventLogRel(): string {
  return join(".comath", "proof_memory", "events.jsonl").replace(/\\/g, "/");
}

function readJson(path: string): unknown | null {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function readCandidateManifest(projectRoot: string, candidate: CandidateRun): CandidateManifest | null {
  if (!candidate.manifest_path) {
    return null;
  }
  const path = assertPathAllowed(projectRoot, candidate.manifest_path, { purpose: "read", resolveRealpath: true });
  const parsed = candidateManifestSchema.safeParse(readJson(path));
  return parsed.success ? parsed.data : null;
}

function normalizeRouteKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function routeKeysForManifest(manifest: CandidateManifest | null): string[] {
  if (!manifest) {
    return [];
  }
  return [...new Set([manifest.theorem_family, manifest.canonical_proposition, manifest.primary_dependency].filter((item): item is string => Boolean(item)).map(normalizeRouteKey))];
}

function artifactPathsForFailure(projectRoot: string, failure: CandidateRun, manifest: CandidateManifest | null): string[] {
  const paths = new Set<string>();
  if (failure.manifest_path) {
    paths.add(failure.manifest_path.replace(/\\/g, "/"));
  }
  if (manifest) {
    for (const artifact of manifest.artifacts) {
      paths.add(join(manifest.workspace_path, artifact.path).replace(/\\/g, "/"));
    }
    if (manifest.variant_id === "V8") {
      paths.add(join(manifest.workspace_path, "dialectical_stress.json").replace(/\\/g, "/"));
    }
  }
  return [...paths].filter((path) => {
    try {
      return existsSync(assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true }));
    } catch {
      return false;
    }
  });
}

function repairsForFailure(projectRoot: string, failure: CandidateRun, manifest: CandidateManifest | null): string[] {
  if (!manifest) {
    return ["rerun only after new context or theorem repair"];
  }
  const failureRoutesPath = join(manifest.workspace_path, "failure_routes.json").replace(/\\/g, "/");
  const payload = readJson(assertPathAllowed(projectRoot, failureRoutesPath, { purpose: "read", resolveRealpath: true }));
  if (payload && typeof payload === "object" && Array.isArray((payload as { recovery_hints?: unknown }).recovery_hints)) {
    return (payload as { recovery_hints: unknown[] }).recovery_hints.filter((item): item is string => typeof item === "string");
  }
  return manifest.failures.length > 0 ? manifest.failures : ["split or repair the obligation before retrying"];
}

function routeKeysForObligation(obligation: ProofObligation): string[] {
  const values = [obligation.locked_statement_nl];
  const structured = obligation.locked_statement_structured;
  if (structured && typeof structured === "object") {
    for (const value of Object.values(structured)) {
      if (typeof value === "string") {
        values.push(value);
      }
    }
  }
  return [...new Set(values.map(normalizeRouteKey))];
}

function clusterReason(candidate: CandidateRun): string {
  if (candidate.hard_vetoes.length > 0) {
    return `hard veto: ${candidate.hard_vetoes.join(", ")}`;
  }
  if (candidate.candidate_statement_hash && candidate.candidate_statement_hash !== candidate.locked_statement_hash) {
    return "statement drift from locked obligation";
  }
  if (candidate.state === "candidate_refutes_step") {
    return "candidate refutes the step";
  }
  if (candidate.state === "candidate_blocked") {
    return "candidate blocked";
  }
  return "candidate did not produce proof-grade evidence";
}

function clusterFailures(failures: CandidateRun[]): FailureAggregate["failure_clusters"] {
  const byReason = new Map<string, CandidateRun[]>();
  for (const failure of failures) {
    const reason = clusterReason(failure);
    byReason.set(reason, [...(byReason.get(reason) ?? []), failure]);
  }
  return [...byReason.entries()].map(([reason, candidates], index) => ({
    cluster_id: `FC-${String(index + 1).padStart(4, "0")}`,
    reason,
    candidate_ids: candidates.map((candidate) => candidate.candidate_id),
    variant_ids: candidates.map((candidate) => candidate.variant_id)
  }));
}

export function recordFailedRoutes(input: { projectRoot: string; campaign: ResearchCampaign; candidates: CandidateRun[] }): FailureAggregate {
  const failures = input.candidates.filter((candidate) => candidate.state !== "candidate_kernel_checked");
  const eventLogRel = proofMemoryEventLogRel();
  const path = assertPathAllowed(input.projectRoot, eventLogRel, {
    purpose: "runtime-write"
  });
  mkdirSync(dirname(path), { recursive: true });
  const selected = input.candidates.find((candidate) => candidate.state === "candidate_kernel_checked") ?? null;
  const stage = input.candidates[0]?.stage ?? "lemma_sprint";
  const obligationId = input.candidates[0]?.obligation_id ?? "PO-0001";
  const createdAt = new Date().toISOString();
  for (const failure of failures) {
    const manifest = readCandidateManifest(input.projectRoot, failure);
    appendFileSync(
      path,
      `${JSON.stringify({
        type: "FailureRoute",
        campaign_id: input.campaign.campaign_id,
        candidate_id: failure.candidate_id,
        stage: failure.stage,
        obligation_id: failure.obligation_id,
        variant_id: failure.variant_id,
        state: failure.state,
        status: "active",
        reason: clusterReason(failure),
        locked_statement_hash: failure.locked_statement_hash,
        candidate_statement_hash: failure.candidate_statement_hash ?? null,
        theorem_family: manifest?.theorem_family ?? null,
        canonical_proposition: manifest?.canonical_proposition ?? null,
        primary_dependency: manifest?.primary_dependency ?? null,
        route_keys: routeKeysForManifest(manifest),
        manifest_path: failure.manifest_path ?? null,
        artifact_paths: artifactPathsForFailure(input.projectRoot, failure, manifest),
        counterexamples: failure.state === "candidate_refutes_step" ? repairsForFailure(input.projectRoot, failure, manifest) : [],
        blockers: failure.hard_vetoes,
        repairs: repairsForFailure(input.projectRoot, failure, manifest),
        hard_vetoes: failure.hard_vetoes,
        superseded_by: null,
        final_handoff_capsule_path: null,
        proof_authority: "none",
        created_at: createdAt
      })}\n`,
      "utf8"
    );
  }
  const aggregateRel = join(
    ".comath",
    "proof_memory",
    `failure_aggregate_${input.campaign.campaign_id}_${stage}_${obligationId}.json`
  ).replace(/\\/g, "/");
  const aggregatePath = assertPathAllowed(input.projectRoot, aggregateRel, {
    purpose: "runtime-write"
  });
  const aggregate: FailureAggregate = {
    aggregate_id: `FAG-${input.campaign.campaign_id}-${stage}-${obligationId}`,
    type: "FailureRouteAggregate",
    campaign_id: input.campaign.campaign_id,
    stage,
    obligation_id: obligationId,
    selected_candidate_id: selected?.candidate_id ?? null,
    total_candidates: input.candidates.length,
    total_failed_routes: failures.length,
    failed_candidate_ids: failures.map((candidate) => candidate.candidate_id),
    failure_clusters: clusterFailures(failures),
    hard_vetoes: failures.flatMap((candidate) => candidate.hard_vetoes),
    recommendations:
      failures.length === 0
        ? []
        : [
            "preserve failed routes as proof memory before retrying",
            "split or repair the obligation if no kernel-checked candidate remains",
            "run refutation search before integrating a repaired candidate"
          ],
    proof_authority: "none",
    event_log_path: eventLogRel,
    aggregate_path: aggregateRel,
    created_at: createdAt
  };
  writeFileSync(aggregatePath, `${JSON.stringify(aggregate, null, 2)}\n`, "utf8");
  return aggregate;
}

export function readProofMemoryEvents(projectRoot: string): ProofMemoryFailureRoute[] {
  const path = assertPathAllowed(projectRoot, proofMemoryEventLogRel(), { purpose: "runtime-write" });
  if (!existsSync(path)) {
    return [];
  }
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ProofMemoryFailureRoute);
}

export function retrieveSimilarFailedRoutes(input: { projectRoot: string; obligation: ProofObligation }): ProofMemoryRetrieval {
  const queryKeys = new Set(routeKeysForObligation(input.obligation));
  const matches = readProofMemoryEvents(input.projectRoot).filter((event) => {
    if (event.locked_statement_hash === input.obligation.statement_hash) {
      return true;
    }
    return event.route_keys.some((key) => queryKeys.has(key));
  });
  const warnings: ProofMemoryRetrievalWarning[] = [];
  for (const match of matches) {
    if (match.locked_statement_hash !== input.obligation.statement_hash) {
      warnings.push({
        code: "stale_fact",
        candidate_id: match.candidate_id,
        message: `failed route ${match.candidate_id} was recorded for a different locked statement hash`
      });
    }
    if (match.status === "superseded" || match.superseded_by) {
      warnings.push({
        code: "superseded_fact",
        candidate_id: match.candidate_id,
        message: `failed route ${match.candidate_id} is superseded${match.superseded_by ? ` by ${match.superseded_by}` : ""}`
      });
    }
    if (match.blockers.length > 0) {
      warnings.push({
        code: "unresolved_blocker",
        candidate_id: match.candidate_id,
        message: `failed route ${match.candidate_id} still carries unresolved blockers`
      });
    }
  }

  const warningLogRel = join(".comath", "proof_memory", "stale_or_superseded_warnings.jsonl").replace(/\\/g, "/");
  const warningLogPath = assertPathAllowed(input.projectRoot, warningLogRel, { purpose: "runtime-write" });
  mkdirSync(dirname(warningLogPath), { recursive: true });
  writeFileSync(warningLogPath, warnings.map((warning) => JSON.stringify({ ...warning, created_at: new Date().toISOString() })).join("\n") + (warnings.length ? "\n" : ""), "utf8");
  return {
    matches,
    warnings,
    warning_log_path: warningLogRel
  };
}
