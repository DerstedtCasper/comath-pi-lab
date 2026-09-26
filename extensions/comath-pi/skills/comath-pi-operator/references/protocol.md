# CoMath Pi operator protocol

The external harness sends a JSON request through Pi's `/cm:operator` command:

```json
{"version":1,"request_id":"req-001","tool":"research_capabilities_get","input":{}}
```

Pi emits a custom message with `customType: "comath.operator.response.v1"` and
`triggerTurn: false`. Its `details` are:

```json
{"version":1,"request_id":"req-001","tool":"research_capabilities_get","result":{"ok":true,"data":{}}}
```

The request ID is echoed exactly. A failure has
`result: {"ok":false,"code":"...","error":"..."}`. Do not turn an unknown
tool into an arbitrary HTTP path; operator tools are a fixed allowlist.

Persist a non-authoritative handoff outside `.comath/` with the bound project,
campaign ID, operation ID, start command ID, last processed event sequence, and
at most one pending mutation. Write a pending record only before a mutation;
reads remain available beside a pending mutation and cannot erase it. Never
advance the processed-event cursor from a snapshot sequence. On reopen, probe
the current capabilities and reject a different or unverified project before
acting. A lost response is retried with the original command ID and payload.

The operator credential permits research control only. It never permits ticket
issuance or formal approval. `ctx.hasUI`, a model tool call, or an external
harness message is not proof of human confirmation.

## Bounded argv-array invocations

All paths below are absolute. Do not compose JSON or shell snippets into a
command string.

Windows npm installation, with Pi invoked through Node rather than a `.cmd`:

```js
spawn(process.execPath, [
  helper, '--pi', '<absolute-node.exe>', '--pi-arg', piBundle,
  '--extension', extension, '--project', projectRoot,
  '--request-file', requestFile, '--handoff-file', handoffFile
], { shell: false, stdio: 'inherit' });
```

POSIX installation with a Pi executable:

```js
spawn(process.execPath, [
  helper, '--pi', '/usr/local/bin/pi', '--extension', extension,
  '--project', projectRoot, '--stdio', '--handoff-file', handoffFile
], { shell: false, stdio: ['pipe', 'pipe', 'inherit'] });
```

The helper first reads the actual Pi version, then uses `get_commands` in the
same RPC process. It requires exactly one `cm:operator` registration whose
extension provenance matches the selected extension path before it sends a
prompt. It waits for both `response(prompt, success=true)` and the matching
custom business receipt; neither response alone establishes completion.

If a configured service is unavailable, a harness that is authorized to start
the existing service may also pass `--comathd-entry <absolute-cli.js>` and
`--comathd-config <absolute-config>` (and optionally `--comathd-node
<absolute-node>`). The helper starts that existing `comathd serve` command once
and retries the request. A startup `OWNER_CONFLICT`, `MIGRATION_BLOCKED`, or
other CLI code is returned unchanged; it never selects a replacement port or
creates a second scheduler.

For event supervision, read a bounded page using the stored cursor, process it,
then include `--processed-event-seq <exact-last-processed-seq>` on a later
successful helper call using the same handoff file. The cursor never advances
from a dashboard or event `snapshot_seq`, so an interrupted harness can replay
events but cannot silently skip them. Run one bounded supervision round every
30 seconds or on an event wake-up, drain any backlog before waiting, and do not
retry, synthesize, patch, or notify again while state is unchanged. The
30-second default is also the per-request timeout; on a transport error or lost
start response, retain the pending mutation and retry only the same command ID
and payload after the project-binding probe succeeds.

`research_validation_intake_preparations_list` is a read-only fixed operator
tool. It returns durable, non-authoritative candidates that are awaiting
operator-supplied formal drafts; it cannot prepare a lock, issue a ticket,
approve an intake, or promote a proof.

`research_dashboard_get` is a read-only campaign snapshot. Use it only after
`research_capabilities_get` reports it available; it does not subscribe, write
state, or elevate any research or proof result.

`research_artifact_read` is a read-only fixed operator tool for an
operator-visible artifact. Its input is an `artifact_id` plus optional
non-negative `offset` and `length` (at most 262144 bytes). It returns a bounded
base64 byte slice with the full `artifact_sha256`, the slice `bytes_sha256`, and
the returned range. A slice is evidence material, not a proof result; never
invent a host path, worker credential, or approval from it.

`research_validation_issue_resolve` is a fixed operator tool, not a free-form
resolution assertion. Its input names a candidate, the existing issue, a
separately accepted `dispute` or `referee` task, and newly cited artifact
references. The service rejects non-independent tasks, old evidence, missing
authorization policy, or any attempt to promote a proof.

The package helper normally disables discovered extensions and skills for a
minimal RPC surface, then loads only its explicit CoMath extension. A host may
pass selected additional Pi arguments (including another explicit
`--extension` or `--skill`) through repeated `--pi-arg` values; discovery stays
off and the other extension receives no worker, host-approval, scheduler, or
Lean authority. It removes credential-named environment variables before spawn
and preserves only `COMATH_OPERATOR_TOKEN` as a credential. A request succeeds
only after both its matching Pi `response(prompt, success=true)` and its
matching `comath.operator.response.v1` business receipt arrive; an RPC failure
or extension error fails the operation even if the business receipt arrived
first. `--request-file` and `--stdio` always print the resulting JSON line, but
leave a nonzero process exit status for a business `ok:false` or transport
failure. Its explicit `--load-package-skill` option additionally loads only the
co-packaged `skills/comath-pi-operator` directory; it fails if that exact
package resource is absent and does not enable global discovery, host approval,
or model turns. An unexpected Pi `extension_ui_request` is answered with
`cancelled:true`; the helper never turns a headless dialog into approval.
