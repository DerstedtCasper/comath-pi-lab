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
campaign ID, start command ID, last observed event sequence, and at most one
pending mutation. Write a pending mutation before dispatch; clear it only after
the business receipt arrives. A lost response is retried with the original
command ID and payload.

The operator credential permits research control only. It never permits ticket
issuance or formal approval. `ctx.hasUI`, a model tool call, or an external
harness message is not proof of human confirmation.
