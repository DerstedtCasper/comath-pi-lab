import { z } from "zod";
import { artifactPointerSchema, usageSchema } from "../../research/research-schemas.js";
const id = z.string().min(1).max(200);
const base = { attempt_key: id, source_key: id, source_seq: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), observed_at: z.iso.datetime() };
export const workerEventSchema = z.discriminatedUnion("type", [
  z.strictObject({ ...base, type: z.literal("started"), runtime_kind: id, owned_handle_ref: id }),
  z.strictObject({ ...base, type: z.literal("heartbeat") }),
  z.strictObject({ ...base, type: z.literal("tool_started"), tool_id: id, correlation_id: id }),
  z.strictObject({ ...base, type: z.literal("tool_completed"), tool_id: id, correlation_id: id, status: z.enum(["succeeded", "failed", "cancelled"]) }),
  z.strictObject({ ...base, type: z.literal("usage_snapshot"), usage: usageSchema, thread_id: id.optional() }),
  z.strictObject({ ...base, type: z.literal("checkpoint_requested"), reason: id }),
  z.strictObject({ ...base, type: z.literal("result_available"), artifact: artifactPointerSchema }),
  z.strictObject({ ...base, type: z.literal("provider_error"), code: id, retryable: z.boolean() }),
  z.strictObject({ ...base, type: z.literal("completed"), status: z.enum(["succeeded", "failed", "cancelled"]), exit_code: z.number().int().nullable() }),
  z.strictObject({ ...base, type: z.literal("termination_confirmed"), owned_handle_ref: id })
]);
export type WorkerEvent = z.infer<typeof workerEventSchema>;
