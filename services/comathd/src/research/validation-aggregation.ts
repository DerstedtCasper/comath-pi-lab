import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { z } from "zod";
import { listArtifactRefs } from "../artifacts/store.js";
import { ComathError } from "../errors.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { createResearchEventStore } from "./event-store.js";
import { assertProjectReadable, resolveProjectCommitPath } from "./project-commit.js";
import type { ProjectRuntime } from "./project-runtime.js";
import type { ResearchEvent } from "./research-store.js";
import { artifactPointerSchema, type ArtifactPointer, type ResearchTask } from "./research-schemas.js";
import { researchResultSchema, validationResultSchema, type ResearchResultService, type ResearchCandidatePublication,
  type ResearchResult, type ValidationResult } from "./research-result-service.js";
import { VALIDATION_SLOTS, type ValidationRoleSlot } from "./validation-contracts.js";

type Accepted = { task: ResearchTask; event: ResearchEvent; ref: ArtifactPointer; result: ResearchResult | ValidationResult };
export type ValidationIssue = { issue_id: string; candidate_id: string; source_task_id: string; result_ref: ArtifactPointer;
  reason: string; details: string[]; evidence_refs: ArtifactPointer[]; proof_authority: "none" };
export type ValidationAggregationOptions = {
  results: ResearchResultService;
  /** Trusted host selection, re-read inside the commit transaction; never a worker-supplied policy. */
  approvedPolicy: (candidateId: string) => { policy_version: string; approved_assumptions: readonly string[] } | undefined;
  /** Host interpreter of an accepted independent comparison, only invoked after both blind slots finish. */
  blindComparison?: (a: Readonly<Accepted>, b: Readonly<Accepted>) => { task_id: string; outcome: "consistent" | "disagreement" } | undefined;
  /** Independent accepted dispute/referee evidence must be interpreted by a trusted consumer. */
  authorizeResolution?: (issue: Readonly<ValidationIssue>, resolution: Readonly<Accepted>, evidence: readonly ArtifactPointer[]) => boolean;
};
const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
const id = z.string().min(1).max(160);
const aggregationInputSchema = z.strictObject({ candidate_id: id, policy_version: id });
const resolutionInputSchema = z.strictObject({ candidate_id: id, issue_id: id, task_id: id, evidence_refs: z.array(artifactPointerSchema).min(1).max(100) });
const field = (event: ResearchEvent, name: string): unknown => (event.payload as Record<string, unknown>)[name];
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }
function eventFromRow(row: Record<string, unknown>): ResearchEvent {
  return { seq: Number(row.seq), campaign_id: String(row.campaign_id),
    ...(row.task_id == null ? {} : { task_id: String(row.task_id) }), ...(row.generation == null ? {} : { generation: Number(row.generation) }),
    type: String(row.type), actor: String(row.actor), payload: JSON.parse(String(row.payload_json)), payload_sha256: String(row.payload_sha256), created_at: String(row.created_at) };
}

/** Research validation is an evidence routing state, never Lean proof authority. */
export function createValidationAggregation(runtime: ProjectRuntime, options: ValidationAggregationOptions) {
  const store = runtime.store;
  function read(ref: ArtifactPointer, json = true): unknown {
    const record = listArtifactRefs(runtime.root).find(value => value.id === ref.artifact_id && value.sha256 === ref.sha256);
    if (!record) fail("VALIDATION_ARTIFACT_INVALID");
    const path = resolveProjectCommitPath(runtime.root, record.path), size = statSync(path).size;
    if (size > (json ? 256 * 1024 : 16 * 1024 * 1024)) fail("VALIDATION_ARTIFACT_INVALID");
    const bytes = readFileSync(path);
    if (bytes.length !== size || createHash("sha256").update(bytes).digest("hex") !== ref.sha256) fail("VALIDATION_ARTIFACT_INVALID");
    return json ? JSON.parse(bytes.toString("utf8")) : bytes;
  }
  function accepted(taskId: string): Accepted | undefined {
    const task = store.getTask(taskId);
    if (!task || task.status !== "succeeded" || !task.accepted_result_id) return;
    const row = store.get("SELECT * FROM events WHERE task_id=? AND generation=? AND type='ResearchResultAccepted' AND json_extract(payload_json,'$.result_ref.artifact_id')=? ORDER BY seq DESC LIMIT 1", taskId, task.generation, task.accepted_result_id);
    if (!row) fail("VALIDATION_RESULT_PROVENANCE_INVALID");
    const event = eventFromRow(row), ref = (event.payload as { result_ref: ArtifactPointer }).result_ref;
    if (!options.results.verifyAcceptedResult(event, task, ref)) fail("VALIDATION_RESULT_PROVENANCE_INVALID");
    const payload = read(ref) as { kind: string };
    return { task, event, ref, result: payload.kind === "validation" ? validationResultSchema.parse(payload) : researchResultSchema.parse(payload) };
  }
  function history(type: string, candidateId: string): ResearchEvent[] {
    return store.all("SELECT * FROM events WHERE type=? AND actor='service:validation-aggregation' AND json_extract(payload_json,'$.candidate_id')=? ORDER BY seq", type, candidateId)
      .map(row => { const event = eventFromRow(row); if (hash(event.payload) !== event.payload_sha256) fail("VALIDATION_EVENT_CORRUPT"); return event; });
  }
  function emit(type: string, campaignId: string, sourceTaskId: string, payload: Record<string, unknown>): ResearchEvent {
    const events = createResearchEventStore(runtime);
    try { return events.appendEvent({ campaign_id: campaignId, task_id: sourceTaskId, type, actor: "service:validation-aggregation", payload: JSON.parse(canonicalJson(payload)) }); }
    finally { events.close(); }
  }
  function publication(candidateId: string) {
    const row = store.get("SELECT * FROM candidates WHERE candidate_id=?", candidateId);
    if (!row) fail("VALIDATION_CANDIDATE_INVALID");
    const metadata = JSON.parse(String(row.result_json)) as ResearchCandidatePublication, source = store.getTask(String(row.source_task_id));
    const event = store.get("SELECT * FROM events WHERE type='ResearchCandidatePublished' AND json_extract(payload_json,'$.candidate_id')=? ORDER BY seq LIMIT 1", candidateId);
    if (!source || !event || !options.results.verifyPublishedCandidate(eventFromRow(event), source, metadata.result_ref)) fail("VALIDATION_CANDIDATE_INVALID");
    assertProjectReadable(runtime.root, undefined, source.campaign_id);
    return { metadata, source, event: eventFromRow(event), result: researchResultSchema.parse(read(metadata.result_ref)) };
  }
  function openIssues(candidateId: string): ValidationIssue[] {
    const resolved = new Set(history("ValidationIssueResolved", candidateId).map(event => String(field(event, "issue_id"))));
    return history("ValidationIssueOpened", candidateId).map(event => event.payload as ValidationIssue).filter(issue => !resolved.has(issue.issue_id));
  }
  function aggregateValidation(input: { candidate_id: string; policy_version: string }) {
    input = aggregationInputSchema.parse(input);
    return store.transaction(() => {
      const { metadata, source, event: publicationEvent, result: published } = publication(input.candidate_id);
      const policy = options.approvedPolicy(input.candidate_id);
      const slots = store.all("SELECT * FROM validation_tasks WHERE candidate_id=? AND policy_version=? ORDER BY role_slot", input.candidate_id, input.policy_version);
      const allSlots = store.all("SELECT * FROM validation_tasks WHERE candidate_id=?", input.candidate_id);
      const knownIssues = new Set(history("ValidationIssueOpened", input.candidate_id).map(event => String(field(event, "issue_id"))));
      function issue(value: Accepted, reason: string, details: string[], evidence: ArtifactPointer[]) {
        const body: ValidationIssue = { issue_id: `VISSUE-${hash({ candidate_id: input.candidate_id, task_id: value.task.task_id, result_ref: value.ref, reason, details })}`,
          candidate_id: input.candidate_id, source_task_id: value.task.task_id, result_ref: value.ref, reason, details, evidence_refs: evidence, proof_authority: "none" };
        if (!knownIssues.has(body.issue_id)) { emit("ValidationIssueOpened", source.campaign_id, source.task_id, body); knownIssues.add(body.issue_id); }
      }
      // Scan every policy and historical slot before evaluating today's six results.
      for (const slot of allSlots) for (const taskId of new Set([String(slot.current_task_id), ...JSON.parse(String(slot.prior_task_ids_json)) as string[]])) {
        const value = accepted(taskId); if (!value || value.result.kind !== "validation") continue;
        const result = validationResultSchema.parse(value.result);
        if (result.outcome === "refuted" || result.counterexample_refs.length) issue(value, "counterexample", [result.conclusion], [...result.evidence_refs, ...result.counterexample_refs]);
        if (result.missing_assumptions.length) issue(value, "missing_assumptions", result.missing_assumptions, result.evidence_refs);
        if (result.disagreements.length) issue(value, "disagreement", result.disagreements, result.evidence_refs);
      }
      const blockers: { role_slot?: ValidationRoleSlot; code: string }[] = [], current: Accepted[] = [];
      if (!policy || policy.policy_version !== input.policy_version) blockers.push({ code: "VALIDATION_POLICY_NOT_OPERATIVE" });
      const unapproved = policy ? [...new Set(published.claims.flatMap(claim => claim.assumptions).filter(assumption => !policy.approved_assumptions.includes(assumption)))] : [];
      if (unapproved.length) {
        blockers.push({ code: "VALIDATION_UNAPPROVED_ASSUMPTIONS" });
        issue({ task: source, event: publicationEvent, ref: metadata.result_ref, result: published }, "candidate_unapproved_assumptions", unapproved, [metadata.result_ref]);
      }
      if (!published.claims.length) blockers.push({ code: "VALIDATION_STATEMENT_REQUIRED" });
      for (const role of VALIDATION_SLOTS) {
        const slot = slots.find(value => value.role_slot === role), value = slot ? accepted(String(slot.current_task_id)) : undefined;
        if (!value || value.result.kind !== "validation") { blockers.push({ role_slot: role, code: "VALIDATION_SLOT_WAITING" }); continue; }
        const result = validationResultSchema.parse(value.result); current.push(value);
        if (result.outcome !== "supported" || result.missing_assumptions.length || result.disagreements.length || result.counterexample_refs.length)
          blockers.push({ role_slot: role, code: `VALIDATION_${result.outcome.toUpperCase()}_OR_ADVERSE` });
        if (published.claims.some(claim => !result.claims_examined.includes(claim.statement))) blockers.push({ role_slot: role, code: "VALIDATION_CLAIMS_INCOMPLETE" });
      }
      const blindA = current.find(value => (value.result as ValidationResult).role_slot === "reproduce_a"), blindB = current.find(value => (value.result as ValidationResult).role_slot === "reproduce_b");
      let comparisonRef: ArtifactPointer | null = null;
      if (blindA && blindB) {
        const comparison = options.blindComparison?.(blindA, blindB), value = comparison ? accepted(comparison.task_id) : undefined;
        if (!value || !comparison || value.task.kind !== "synthesize" || value.task.specialization !== "blind_comparison"
          || value.task.campaign_id !== source.campaign_id || !same(value.task.scope, source.scope)
          || value.event.seq <= Math.max(blindA.event.seq, blindB.event.seq)
          || ![blindA.ref, blindB.ref].every(ref => value.task.input_refs.some(input => same(input, ref))
            && value.result.claims.some(claim => claim.artifact_refs.some(cited => same(cited, ref))))) blockers.push({ code: "VALIDATION_BLIND_COMPARISON_REQUIRED" });
        else { comparisonRef = value.ref; if (comparison.outcome === "disagreement") { issue(value, "blind_disagreement", [value.result.summary], [blindA.ref, blindB.ref]); blockers.push({ code: "VALIDATION_BLIND_DISAGREEMENT" }); } }
      }
      const issues = openIssues(input.candidate_id);
      if (issues.length) blockers.push({ code: "VALIDATION_OPEN_ADVERSE_ISSUES" });
      const issueEvents = history("ValidationIssueOpened", input.candidate_id), resolutionEvents = history("ValidationIssueResolved", input.candidate_id);
      const report = { ...input, candidate_ref: metadata.result_ref, scope: source.scope, policy_sha256: hash(policy ?? null), state: blockers.length ? "waiting" : "research_validated",
        slots: slots.map(slot => ({ role_slot: String(slot.role_slot), task_id: String(slot.current_task_id) })),
        result_refs: current.map(value => ({ task_id: value.task.task_id, ref: value.ref })), comparison_ref: comparisonRef,
        blockers, open_issue_ids: issues.map(issue => issue.issue_id),
        open_issue_refs: issueEvents.filter(event => issues.some(issue => issue.issue_id === field(event, "issue_id")))
          .map(event => ({ issue_id: String(field(event, "issue_id")), event_seq: event.seq, payload_sha256: event.payload_sha256 })),
        issue_resolution_refs: resolutionEvents.map(event => ({ issue_id: String(field(event, "issue_id")), event_seq: event.seq,
          payload_sha256: event.payload_sha256, result_ref: field(event, "resolution_ref") as ArtifactPointer })), proof_authority: "none" as const };
      if (!same(allSlots, store.all("SELECT * FROM validation_tasks WHERE candidate_id=?", input.candidate_id))
        || !same(policy ?? null, options.approvedPolicy(input.candidate_id) ?? null)) fail("VALIDATION_AGGREGATION_CHANGED");
      for (const value of current) {
        const latest = accepted(value.task.task_id);
        if (!latest || latest.event.seq !== value.event.seq || !same(latest.ref, value.ref)) fail("VALIDATION_AGGREGATION_CHANGED");
      }
      const reportHash = hash(report), previous = history("ValidationAggregated", input.candidate_id).find(event => field(event, "report_sha256") === reportHash);
      if (!previous) emit("ValidationAggregated", source.campaign_id, source.task_id, { ...report, report_sha256: reportHash });
      if (policy?.policy_version === input.policy_version) {
        store.run("UPDATE candidates SET validation_state=? WHERE candidate_id=?", report.state, input.candidate_id);
        if (!blockers.length && !history("ValidationIntakePrepareQueued", input.candidate_id).some(event => field(event, "report_sha256") === reportHash))
          emit("ValidationIntakePrepareQueued", source.campaign_id, source.task_id, { ...report, report_sha256: reportHash, intake_state: "queued_not_prepared" });
      }
      return report;
    });
  }
  function resolveValidationIssue(input: { candidate_id: string; issue_id: string; task_id: string; evidence_refs: ArtifactPointer[] }) {
    input = resolutionInputSchema.parse(input);
    return store.transaction(() => {
      const { source } = publication(input.candidate_id);
      const previous = history("ValidationIssueResolved", input.candidate_id).find(event => field(event, "issue_id") === input.issue_id);
      if (previous) {
        if (field(previous, "task_id") !== input.task_id || !same(field(previous, "evidence_refs"), input.evidence_refs)) fail("VALIDATION_RESOLUTION_CONFLICT");
        return previous;
      }
      const issue = openIssues(input.candidate_id).find(value => value.issue_id === input.issue_id);
      if (!issue) fail("VALIDATION_OPEN_ISSUE_REQUIRED");
      const value = accepted(input.task_id);
      if (!value || value.task.task_id === issue.source_task_id || value.task.task_id === source.task_id
        || value.task.campaign_id !== source.campaign_id || !same(value.task.scope, source.scope)
        || !["synthesize", "referee"].includes(value.task.kind) || value.task.problem_slice !== `validation-issue:${issue.issue_id}`
        || !["dispute", "referee"].includes(value.task.specialization ?? "")
        || !value.task.input_refs.some(ref => same(ref, issue.result_ref))) fail("VALIDATION_INDEPENDENT_RESOLUTION_REQUIRED");
      const opened = history("ValidationIssueOpened", input.candidate_id).find(event => field(event, "issue_id") === input.issue_id)!;
      const cited = value.result.claims.flatMap(claim => claim.artifact_refs);
      if (value.event.seq <= opened.seq || !input.evidence_refs.length || input.evidence_refs.some(ref => !cited.some(candidate => same(candidate, ref))
        || ref.sha256 === issue.result_ref.sha256 || issue.evidence_refs.some(old => old.sha256 === ref.sha256))) fail("VALIDATION_NEW_RESOLUTION_EVIDENCE_REQUIRED");
      for (const ref of input.evidence_refs) read(ref, false);
      if (options.authorizeResolution?.(issue, value, input.evidence_refs) !== true) fail("VALIDATION_RESOLUTION_NOT_AUTHORIZED");
      return emit("ValidationIssueResolved", source.campaign_id, source.task_id, { ...input, resolution_ref: value.ref, original_issue_event_seq: opened.seq,
        original_issue_sha256: opened.payload_sha256, proof_authority: "none" });
    });
  }
  return { aggregateValidation, resolveValidationIssue, openIssues };
}
