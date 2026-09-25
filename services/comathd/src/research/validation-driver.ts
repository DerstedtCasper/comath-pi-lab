import { ComathError } from "../errors.js";
import { createResearchEventStore } from "./event-store.js";
import type { ProjectRuntime } from "./project-runtime.js";
import type { createValidationFanout } from "./validation-fanout.js";
import type { createValidationAggregation } from "./validation-aggregation.js";

/** Durable source scans make event wakeups disposable; each consumer owns its idempotency. */
export function createValidationDriver(runtime: ProjectRuntime, policyVersion: string,
  fanout: ReturnType<typeof createValidationFanout>, aggregation: ReturnType<typeof createValidationAggregation>) {
  const events = createResearchEventStore(runtime), blockers = new Map<string, string>();
  let running = false, closed = false, requested = false, pending: Promise<void> | undefined;
  let fatalError: unknown;
  let unsubscribe: (() => void) | undefined, timer: ReturnType<typeof setInterval> | undefined;
  async function drain(): Promise<void> {
    const rows = runtime.store.all("SELECT e.seq,e.campaign_id,e.task_id,e.payload_json FROM events e WHERE e.type='ResearchCandidatePublished' ORDER BY e.seq");
    for (const row of rows) {
      if (closed) return;
      const payload = JSON.parse(String(row.payload_json)), candidateId = String(payload.candidate_id);
      const campaign = runtime.store.getCampaign(String(row.campaign_id));
      if (!campaign || ["completed", "cancelled"].includes(campaign.state)) continue;
      try {
        await fanout.requestValidationFanout({ candidate_id: candidateId, policy_version: policyVersion, source_event_seq: Number(row.seq) });
        if (closed) return;
        aggregation.aggregateValidation({ candidate_id: candidateId, policy_version: policyVersion });
        blockers.delete(candidateId);
      } catch (error) {
        const code = error instanceof ComathError ? error.code : "VALIDATION_DRIVER_ERROR";
        if (blockers.get(candidateId) !== code) {
          blockers.set(candidateId, code);
          events.appendEvent({ campaign_id: String(row.campaign_id), task_id: String(row.task_id), type: "ValidationConsumerBlocked",
            actor: "service:validation-driver", payload: { candidate_id: candidateId, policy_version: policyVersion, code, proof_authority: "none" } });
        }
      }
    }
  }
  function wake(): void {
    if (!running || closed) return;
    requested = true;
    if (pending) return;
    pending = (async () => {
      // Defer until after pending is assigned so synchronous event subscribers cannot start a second drain.
      await Promise.resolve();
      while (requested && running && !closed) { requested = false; await drain(); }
    })().finally(() => { pending = undefined; });
    // Individual candidate failures are handled above. A store/owner failure remains observable by flush/close.
    void pending.catch(error => { fatalError = error; running = false; });
  }
  return {
    blockers,
    async flush() { if (closed) throw new Error("Validation driver is closed"); if (fatalError) throw fatalError; if (pending) await pending; else await drain(); },
    start() { if (closed) throw new Error("Validation driver is closed"); if (fatalError) throw fatalError; if (running) return; running = true;
      unsubscribe = events.subscribe(wake); timer = setInterval(wake, 15000); timer.unref(); wake(); },
    stop() { running = false; requested = false; unsubscribe?.(); unsubscribe = undefined; if (timer) clearInterval(timer); timer = undefined; },
    async close() { this.stop(); closed = true; try { await pending; if (fatalError) throw fatalError; } finally { events.close(); } }
  };
}
