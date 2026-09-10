import { z } from "zod";
import { artifactPointerSchema } from "./research-schemas.js";

export const VALIDATION_SLOTS = ["referee", "counterexample", "reproduce_a", "reproduce_b", "novelty", "formalization_probe"] as const;
export const validationRoleSlotSchema = z.enum(VALIDATION_SLOTS);
export type ValidationRoleSlot = z.infer<typeof validationRoleSlotSchema>;
export const validationOutcomeSchema = z.enum(["supported", "refuted", "inconclusive", "blocked"]);
export type ValidationOutcome = z.infer<typeof validationOutcomeSchema>;
const id = z.string().min(1).max(160), text = z.string().min(1).max(8192);
const strings = z.array(text).max(100), refs = z.array(artifactPointerSchema).max(100);

/** C4 extras only: the result consumer composes these with its own strict base.
 * A resolved_issues declaration is not authority to close an adverse issue. */
export const validationAssessmentShape = {
  candidate_id: id,
  role_slot: validationRoleSlotSchema,
  outcome: validationOutcomeSchema,
  claims_examined: strings,
  evidence_refs: refs,
  counterexample_refs: refs,
  missing_assumptions: strings,
  disagreements: strings,
  conclusion: text,
  resolved_issues: z.array(z.strictObject({ issue_id: id, evidence_refs: refs.min(1) })).max(100).optional()
};
export const validationAssessmentSchema = z.strictObject(validationAssessmentShape);
export type ValidationAssessment = z.infer<typeof validationAssessmentSchema>;
