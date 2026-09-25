# Durable Research Orchestration

CoMath's durable research runtime coordinates long-running research tasks, formalization intake, and Lean replay for one project at a time. It is opt-in: a host enables it through the `research` configuration consumed by `comathd`.

## Authority boundary

`comathd` is the only writer of trusted project state. It owns durable campaign state, task generations, checkpoints, artifact references, command receipts, audit events, and proof-promotion records. Workers, adapters, Pi, MCP clients, and external harnesses submit bounded requests and artifacts through service interfaces; none may write `.comath/` or set proof authority directly.

Lean source from a worker is a candidate. A claim may become formally checked only after a host-approved formal scope, service-owned replay, scoped evidence verification, and the ordinary claim-promotion gate. A successful provider response, a Pi receipt, a dashboard value, or a worker-declared status is never proof authority.

## Durable campaign flow

1. An operator creates or resumes a campaign with a charter and bounded budget.
2. The service schedules task generations through a shared admission and budget layer. Retries create successors; stale generations cannot change current state.
3. Workers submit checkpoints, result artifacts, and structured candidate material. The service verifies bindings before making a result visible.
4. Formalization is prepared from exact result bytes. A host issues and consumes the approval ticket; operator and worker identities cannot approve a proof scope.
5. Each proof obligation has its own lock, ledger, candidate scope, replay directory, and history. Integrated lemma material is selected only from a verified predecessor package explicitly requested by the root candidate.
6. Service-owned Lean commands run outside short state commits. Their manifests, dependency closure, audit, replay package, and final authority evidence are checked before an ordinary gate can promote a claim.

Campaign pause, cancellation, restart, and handoff preserve receipts and checkpoints. Unknown process ownership is a blocker, not a reason to guess that work has stopped.

## Interfaces

The operator API exposes bounded campaign reads, cursor-based events, status, and allowed mutations. Server-sent events are resumable by cursor. MCP and Pi use the same operator-facing capability boundary; they do not obtain host approval or trusted-write privileges.

The intended interactive route is:

```text
human or external harness -> Pi operator command -> comathd operator interface
```

Direct service use remains supported for hosts that do not use Pi. A transport acknowledgement means only that the request was accepted; clients must read the durable receipt or event state for completion.

## Evidence and deployment limits

The runtime records unavailable adapters, missing execution owners, failed replay checks, and incomplete shutdowns as explicit blockers. Provider calls and operating-system isolation are separately configured and tested capabilities. Their availability is not implied by this architecture document.

Snapshots intended for rollback use the internal-restore audience and require verification before restore. Public-download snapshots are not restore inputs. A migration drains admissions and confirms ownership before snapshot and restore verification; replacing a binary alone is not a rollback procedure. The explicit `comathd rollback` command requires an absolute internal snapshot manifest and a stopped daemon so it can acquire the sole project owner, verify a staging restore, remove newer SQLite sidecars, and restore the selected snapshot without opening a listener.

See [module boundaries](module-boundaries.md), [runtime layout](runtime-layout.md), [adapter contracts](adapter-contracts.md), and [Pi runtime assumptions](../integrations/pi-runtime-assumptions.md) for adjacent boundaries.
