import { z } from "zod";
import { artifactPointerSchema, scopeBindingSchema } from "./research-schemas.js";
import { candidateVariantIdSchema } from "../types/schemas.js";

const id = z.string().min(1).max(160);
const text = z.string().min(1).max(8192);

function safeLeanSourcePath(path: string): boolean {
  if (!path.endsWith(".lean") || /[\\:<>"|?*~\p{Cc}]/u.test(path)) return false;
  return path.split("/").every(segment => segment.length > 0 && segment.length <= 255
    && !/^\.+$/u.test(segment) && !/[. ]$/u.test(segment)
    && !/^(?:con|prn|aux|nul|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³]) *(?:\.|$)/iu.test(segment));
}

/** Canonical relative source name; validation never rewrites the submitted path. */
export const formalCandidateSourcePathSchema = z.string().min(1).max(1024)
  .refine(safeLeanSourcePath, "Expected a safe relative POSIX Lean source path without Windows aliases or escape components");

const formalScopeSchema = scopeBindingSchema.options[1];
const collisionKey = (path: string) => path.normalize("NFC").toLowerCase();

/** Wire shape only: CAS bytes, reservation ownership, approval and proof validity are consumer checks. */
export const formalCandidateSubmissionSchema = z.strictObject({
  task_id: id,
  generation: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  campaign_id: id,
  obligation_id: id,
  candidate_id: z.string().regex(/^CAND-\d{4,}$/).max(160),
  variant_id: candidateVariantIdSchema,
  scope: formalScopeSchema,
  files: z.array(z.strictObject({ relative_path: formalCandidateSourcePathSchema, artifact: artifactPointerSchema })).min(1).max(100),
  theorem_file: formalCandidateSourcePathSchema,
  theorem_name: text,
  declared_imports: z.array(text).max(100),
  introduced_assumptions: z.array(text).max(100),
  requested_dependencies: z.array(artifactPointerSchema).max(100),
  checkpoint_id: id,
  proof_authority: z.literal("none")
}).superRefine((value, context) => {
  const names = new Map<string, number>();
  value.files.forEach((file, index) => {
    const key = collisionKey(file.relative_path);
    if (names.has(key)) context.addIssue({ code: "custom", path: ["files", index, "relative_path"], message: "Duplicate or Windows-equivalent source path" });
    else names.set(key, index);
  });
  value.files.forEach((file, index) => {
    const parts = collisionKey(file.relative_path).split("/");
    for (let end = 1; end < parts.length; end++) {
      if (names.has(parts.slice(0, end).join("/"))) context.addIssue({ code: "custom", path: ["files", index, "relative_path"], message: "A source file also names a parent directory" });
    }
  });
  if (!value.files.some(file => file.relative_path === value.theorem_file)) {
    context.addIssue({ code: "custom", path: ["theorem_file"], message: "The theorem file must exactly match a submitted source path" });
  }
});

export type FormalCandidateSubmission = z.infer<typeof formalCandidateSubmissionSchema>;
