import {
  assumptionLedgerSchema,
  formalSpecLockSchema,
  proofObligationSchema,
  type AssumptionLedger,
  type FormalSpecLock,
  type ProofObligation
} from "../../types/schemas.js";

function assumptionTypesFromLedger(ledger: AssumptionLedger): string[] {
  return ledger.entries.filter((entry) => entry.kind === "assumption").map((entry) => entry.type);
}

export function createProofObligationFromFormalSpecLock(input: {
  obligation_id: string;
  formal_spec_lock: FormalSpecLock;
  assumption_ledger: AssumptionLedger;
}): ProofObligation {
  const lock = formalSpecLockSchema.parse(input.formal_spec_lock);
  const ledger = assumptionLedgerSchema.parse(input.assumption_ledger);

  if (ledger.claim_id !== lock.claim_id) {
    throw new Error("AssumptionLedger claim_id must match FormalSpecLock claim_id");
  }
  if (ledger.formal_spec_lock_hash !== lock.statement_hash) {
    throw new Error("AssumptionLedger formal_spec_lock_hash must match FormalSpecLock statement_hash");
  }

  return proofObligationSchema.parse({
    obligation_id: input.obligation_id,
    claim_id: lock.claim_id,
    locked_statement_nl: lock.normalized_nl_statement,
    locked_statement_structured: {
      schema_version: lock.schema_version,
      theorem_name: lock.theorem_name,
      namespace: lock.namespace,
      theorem_header: lock.theorem_header,
      theorem_type_pretty: lock.theorem_type_pretty,
      variables: lock.variables,
      assumptions: lock.assumptions,
      conclusion: lock.conclusion,
      notation_conventions: lock.notation_conventions,
      trust_profile_id: lock.trust_profile_id
    },
    lean_target: `${lock.namespace}.${lock.theorem_name}`,
    statement_hash: lock.statement_hash,
    dependencies: [],
    assumptions: assumptionTypesFromLedger(ledger),
    status: "queued"
  });
}
