import { createHash } from "node:crypto";
import { z } from "zod";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const qualifiedName = z.string().regex(/^[A-Za-z_][A-Za-z0-9_']*(?:\.[A-Za-z_][A-Za-z0-9_']*)*$/);
const leanNameSegment = "(?:[A-Za-z_][A-Za-z0-9_']*|«[^«»\\r\\n]{1,512}»)";
const leanQualifiedName = z.string().regex(new RegExp(`^${leanNameSegment}(?:\\.${leanNameSegment})*$`));
const rawAuditSchema = z.strictObject({
  target: qualifiedName,
  pretty_type: z.string().min(1).max(1024 * 1024),
  canonical_version: z.literal("lean.expr.canonical.v1"),
  canonical_type: z.string().min(2).max(4 * 1024 * 1024),
  axioms: z.array(qualifiedName).max(100000),
  audit_direct_imports: z.array(qualifiedName).max(100000)
});

export type StructuredLeanAudit = {
  schema_version: "comath.structured_lean_audit.v1";
  result: "pass" | "fail";
  proof_authority: "none";
  theorem_name: string;
  fully_qualified_name: string;
  theorem_type_pretty: string;
  theorem_type_canonical_version: "lean.expr.canonical.v1";
  theorem_type_canonical: string;
  theorem_type_elaborated_hash: string;
  source_file: string;
  source_file_sha256: string;
  audit_source_sha256: string;
  imports: string[];
  axiom_profile: string[];
  environment_fingerprint: string;
  generated_by_run_id: string;
  audit_manifest_path: string;
  hard_vetoes: string[];
};

export type StructuredAuditStatementComparison = {
  schema_version: "comath.structured_audit_statement_comparison.v1";
  result: "pass" | "blocked";
  proof_authority: "none";
  expected_target: string;
  actual_target: string;
  locked_type_elaborated_hash: string | null;
  actual_type_elaborated_hash: string;
  hard_vetoes: string[];
};

type AuditBinding = {
  expected_target: string;
  source_file: string;
  source_file_sha256: string;
  audit_source_sha256: string;
  environment_fingerprint: string;
  generated_by_run_id: string;
  audit_manifest_path: string;
};

function theoremName(name: string): string { return name.split(".").at(-1)!; }
function normalized(values: readonly string[]): string[] { return [...new Set(values)].sort((left, right) => left.localeCompare(right)); }

function failed(binding: AuditBinding, vetoes: readonly string[], value?: Partial<z.infer<typeof rawAuditSchema>>): StructuredLeanAudit {
  const canonical = value?.canonical_type ?? "";
  return {
    schema_version: "comath.structured_lean_audit.v1", result: "fail", proof_authority: "none",
    theorem_name: theoremName(binding.expected_target), fully_qualified_name: value?.target ?? binding.expected_target,
    theorem_type_pretty: value?.pretty_type ?? "", theorem_type_canonical_version: "lean.expr.canonical.v1",
    theorem_type_canonical: canonical, theorem_type_elaborated_hash: sha256(canonical),
    source_file: binding.source_file, source_file_sha256: binding.source_file_sha256, audit_source_sha256: binding.audit_source_sha256,
    imports: normalized(value?.audit_direct_imports ?? []), axiom_profile: normalized(value?.axioms ?? []),
    environment_fingerprint: binding.environment_fingerprint, generated_by_run_id: binding.generated_by_run_id,
    audit_manifest_path: binding.audit_manifest_path, hard_vetoes: normalized(vetoes)
  };
}

/** Parse exactly one marker emitted by a Lean environment audit; caller binds all service-owned provenance. */
export function parseStructuredLeanAuditOutput(input: AuditBinding & { stdout: string }): StructuredLeanAudit {
  const binding: AuditBinding = {
    expected_target: qualifiedName.parse(input.expected_target), source_file: input.source_file,
    source_file_sha256: sha.parse(input.source_file_sha256), audit_source_sha256: sha.parse(input.audit_source_sha256),
    environment_fingerprint: sha.parse(input.environment_fingerprint), generated_by_run_id: z.string().min(1).max(160).parse(input.generated_by_run_id),
    audit_manifest_path: z.string().min(1).max(4096).parse(input.audit_manifest_path)
  };
  const prefix = "COMATH_STRUCTURED_AUDIT_JSON:";
  const records = input.stdout.split(/\r?\n/).filter(line => line.startsWith(prefix)).map(line => line.slice(prefix.length));
  if (records.length !== 1) return failed(binding, ["structured_audit_record_count_invalid"]);
  let parsed: z.infer<typeof rawAuditSchema>;
  try { parsed = rawAuditSchema.parse(JSON.parse(records[0]!)); }
  catch { return failed(binding, ["structured_audit_record_invalid"]); }
  try { JSON.parse(parsed.canonical_type); }
  catch { return failed(binding, ["structured_audit_canonical_type_invalid"], parsed); }
  if (parsed.target !== binding.expected_target) return failed(binding, ["structured_audit_target_mismatch"], parsed);
  return {
    schema_version: "comath.structured_lean_audit.v1", result: "pass", proof_authority: "none",
    theorem_name: theoremName(parsed.target), fully_qualified_name: parsed.target, theorem_type_pretty: parsed.pretty_type,
    theorem_type_canonical_version: parsed.canonical_version, theorem_type_canonical: parsed.canonical_type,
    theorem_type_elaborated_hash: sha256(parsed.canonical_type), source_file: binding.source_file,
    source_file_sha256: binding.source_file_sha256, audit_source_sha256: binding.audit_source_sha256,
    imports: normalized(parsed.audit_direct_imports), axiom_profile: normalized(parsed.axioms),
    environment_fingerprint: binding.environment_fingerprint, generated_by_run_id: binding.generated_by_run_id,
    audit_manifest_path: binding.audit_manifest_path, hard_vetoes: []
  };
}

/** Compare only independently derived environment data with an approved-lock elaboration hash; absent hashes block. */
export function compareStructuredLeanAuditToLock(input: {
  audit: StructuredLeanAudit;
  lock: { namespace: string; theorem_name: string; theorem_type_elaborated_hash?: string };
}): StructuredAuditStatementComparison {
  const expected = `${input.lock.namespace}.${input.lock.theorem_name}`;
  const vetoes: string[] = [];
  if (input.audit.result !== "pass") vetoes.push("structured_audit_failed");
  if (input.audit.fully_qualified_name !== expected) vetoes.push("locked_target_mismatch");
  const locked = input.lock.theorem_type_elaborated_hash;
  if (!locked) vetoes.push("locked_type_elaboration_missing");
  else if (!sha.safeParse(locked).success) vetoes.push("locked_type_elaboration_invalid");
  else if (locked !== input.audit.theorem_type_elaborated_hash) vetoes.push("locked_type_elaboration_mismatch");
  return {
    schema_version: "comath.structured_audit_statement_comparison.v1", result: vetoes.length ? "blocked" : "pass",
    proof_authority: "none", expected_target: expected, actual_target: input.audit.fully_qualified_name,
    locked_type_elaborated_hash: locked ?? null, actual_type_elaborated_hash: input.audit.theorem_type_elaborated_hash,
    hard_vetoes: normalized(vetoes)
  };
}

/** Source is intentionally limited to the declared target; lock/ledger JSON never enters the environment record. */
export function buildStructuredLeanAuditSource(input: { target_module: string; target: string }): string {
  const targetModule = leanQualifiedName.parse(input.target_module), target = leanQualifiedName.parse(input.target);
  return `import Lean
import Lean.Util.CollectAxioms
import ${targetModule}

open Lean Elab Command

private def comathName (name : Name) : Json :=
  match name with
  | .anonymous => Json.arr #[Json.str "anonymous"]
  | .str parent value => Json.arr #[Json.str "str", comathName parent, Json.str value]
  | .num parent value => Json.arr #[Json.str "num", comathName parent, Json.str (toString value)]

private def comathLevel (level : Level) : Except String Json :=
  match level with
  | .zero => .ok <| Json.arr #[Json.str "zero"]
  | .succ value => return Json.arr #[Json.str "succ", ← comathLevel value]
  | .max left right => return Json.arr #[Json.str "max", ← comathLevel left, ← comathLevel right]
  | .imax left right => return Json.arr #[Json.str "imax", ← comathLevel left, ← comathLevel right]
  | .param name => .ok <| Json.arr #[Json.str "param", comathName name]
  | .mvar _ => .error "level metavariable in checked declaration"

private def comathBinder : BinderInfo → String
  | .default => "default"
  | .implicit => "implicit"
  | .strictImplicit => "strictImplicit"
  | .instImplicit => "instImplicit"

partial def comathExpr (value : Expr) : Except String Json :=
  match value with
  | .bvar index => .ok <| Json.arr #[Json.str "bvar", Json.str (toString index)]
  | .fvar _ => .error "free variable in checked declaration"
  | .mvar _ => .error "expression metavariable in checked declaration"
  | .sort level => return Json.arr #[Json.str "sort", ← comathLevel level]
  | .const name levels => return Json.arr #[Json.str "const", comathName name, Json.arr (← levels.mapM comathLevel).toArray]
  | .app function argument => return Json.arr #[Json.str "app", ← comathExpr function, ← comathExpr argument]
  | .lam name type body binder => return Json.arr #[Json.str "lam", comathName name, ← comathExpr type, ← comathExpr body, Json.str (comathBinder binder)]
  | .forallE name type body binder => return Json.arr #[Json.str "forall", comathName name, ← comathExpr type, ← comathExpr body, Json.str (comathBinder binder)]
  | .letE name type value body nonDep => return Json.arr #[Json.str "let", comathName name, ← comathExpr type, ← comathExpr value, ← comathExpr body, Json.bool nonDep]
  | .lit literal => .ok <| Json.arr #[Json.str "lit", Json.str (reprStr literal)]
  | .mdata _ body => comathExpr body
  | .proj name index body => return Json.arr #[Json.str "proj", comathName name, Json.str (toString index), ← comathExpr body]

elab "#comath_structured_audit " target:ident : command => do
  let name := target.getId
  let env ← getEnv
  let some info := env.checked.get.find? name
    | throwError "Target absent: {name}"
  let .thmInfo _ := info
    | throwError "Target is not a theorem: {name}"
  let canonical ← match comathExpr info.type with
    | .ok value => pure value
    | .error message => throwError "{message}"
  let pretty ← liftTermElabM do
    return (← Meta.ppExpr info.type).pretty
  let axioms ← collectAxioms name
  let report := Json.mkObj [
    ("target", toJson name.toString),
    ("pretty_type", toJson pretty),
    ("canonical_version", toJson "lean.expr.canonical.v1"),
    ("canonical_type", toJson canonical.compress),
    ("axioms", toJson (axioms.map Name.toString)),
    ("audit_direct_imports", toJson (env.imports.map fun imported => imported.module.toString))]
  liftIO <| IO.println ("COMATH_STRUCTURED_AUDIT_JSON:" ++ report.compress)

#comath_structured_audit ${target}
`;
}
