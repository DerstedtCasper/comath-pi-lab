# Module Boundaries

| Path | Owner | Boundary |
| --- | --- | --- |
| `README.md`, `CONTRIBUTING.md` | public documentation | Product positioning, setup, invocation, and contribution rules. |
| `docs/architecture/` | public architecture | Release criteria, threat model, adapter contracts, evidence policy, runtime layout, and workflow boundaries. |
| `config/` | sample configuration | Non-secret examples only; live credentials remain host-owned and out of Git, Pi payloads, and evidence packs. |
| `services/comathd/src/types` | shared contracts | Schema and type boundary for projects, claims, evidence, artifacts, campaigns, agent runs, and audit records. |
| `services/comathd/src/security` | path and process policy | Deny-by-default path, secret, runner, and adapter controls. |
| `services/comathd/src/artifacts` | artifact store | Content-addressed ingestion, snapshot/replay material, and evidence-pack helpers. |
| `services/comathd/src/claim` | claim registry | Claim status may not be escalated outside service gates. |
| `services/comathd/src/proof-kernel` | formal workflow core | FormalSpecLock, AssumptionLedger, StatementDiffGate, agent-stage workflow, Lean replay, dependency, axiom, no-cheat, and promotion gates. |
| `services/comathd/src/adapters` | external wheel registry | Literature, theorem-search, ingestion, computation, and agent adapters must remain non-authoritative unless later Lean replay promotes a claim. |
| `services/comathd/src/release` | release gates | GA review, source review, proof-breadth, replay, and certificate gates. |
| `services/comathd/scripts/copy-agent-adapters.mjs` | package build helper | Copies packaged adapter assets into the build output. |
| `extensions/comath-pi/src` | Pi interaction layer | Thin client over `comathd`; no direct trusted `.comath/` writes and no proof authority. |
| `.pi/agents`, `.pi/prompts` | runtime prompt assets | Agent contracts must preserve `proof_authority=none`, `may_mutate_trusted_state=false`, strict output structure, and locked-statement semantics. |
| `.comath/` | runtime state | Written by `comathd`, ignored by Git, and never committed. |

Conflict rule: if two changes need to edit the same public type, schema, route, path policy, gate, dependency-lock logic, final replay logic, or root package file, serialize the work through the coordinator.
