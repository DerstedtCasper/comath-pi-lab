---
name: comath-pi-operator
description: Delegate, supervise, recover, and summarize a bounded CoMath durable research campaign through Pi. Use for research workbench operations, not ordinary math answers or workbench source development.
---

# CoMath Pi operator

Use this skill when a user has authorized a concrete research objective and wants
to operate the local CoMath workbench through Pi. The workbench daemon, not this
skill or the harness, schedules work and owns all durable state.

1. Load the package's `cm:operator` command through Pi and request
   `research_capabilities_get` first. Verify `control_ready`, the bound project,
   and the tools that are actually available.
2. For a new campaign, preserve the user's goal, approach hints, constraints,
   success criteria, bounded budget, and concurrency limit. Send one
   `research_campaign_start` request with a durable `command_id`.
3. For an existing campaign, read status/frontier/events before changing it.
   Do not overwrite a charter with a new brief. Use specific patches or a
   pause/checkpoint followed by a successor task when the scope changes.
4. Treat all research outputs as non-authoritative. `research_validated`, an
   approach hint, a model response, or a Pi receipt is never Lean proof. Report
   formal proof only when the service's existing final replay/gate evidence says
   so.
5. For a validated research candidate, first read
   `research_validation_intake_preparations_list`. Its candidate reference can
   be supplied to the existing preparation request, but it does not create a
   draft, lock, ticket, approval, or proof. The operator path cannot issue
   tickets or approve; a human host must inspect and approve through the
   separate host route.
6. Resolve a validation issue only after an independently accepted `dispute` or
   `referee` task cites the original issue and new artifact evidence. Send
   `research_validation_issue_resolve`; it rechecks those bindings and cannot
   approve a formal lock or promote a proof.
7. Preserve the last observed event sequence and any pending mutation outside
   `.comath/`. Retry a lost start response with the same command ID and payload;
   never generate a replacement campaign merely because a response was lost.

## Running the package helper

Use an argv array and absolute paths. On Windows, invoke the Pi npm bundle
through its Node executable rather than a `.cmd` shim; on POSIX, `--pi` may be
the Pi executable. Read and process each bounded event page before supplying
its exact processed sequence through `--processed-event-seq`; a snapshot is not
an event cursor. A business `ok:false`, RPC failure, extension failure, or
unexpected confirmation leaves a nonzero helper exit status and never grants
approval.

Supervise with one bounded event round every 30 seconds or an event wake-up.
Drain backlog before waiting; unchanged state must not trigger another retry,
synthesis, patch, or notification.

See `references/protocol.md` for Windows and POSIX argv arrays, the optional
configured `comathd serve` recovery path, and handoff/retry examples.
