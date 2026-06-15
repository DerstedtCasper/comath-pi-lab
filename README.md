# CoMath Pi Lab

CoMath Pi Lab is a source-available, non-commercially licensed agentic formal mathematics research workbench built around Lean4/mathlib. It is not a theorem prover, not a replacement for mathlib, and not a private mathematical kernel. CoMath coordinates research agents, external retrieval/search/computation tools, formalization planning, evidence capture, and release gates. A mathematical proof claim is promotable only when Lean4/mathlib clean replay succeeds and the required provenance/integrity material is bound.

中文：CoMath Pi Lab 是围绕 Lean4/mathlib 构建的源码可见、非商用许可的 agentic 形式化数学研究工作台。它不是定理证明器，不替代 mathlib，也不维护私有数学内核。CoMath 负责 agent 调度、外部检索/搜索/计算工具接入、形式化任务规划、证据链和发布门控；数学证明声明只有在 Lean4/mathlib clean replay 通过，并绑定所需来源与完整性证据后，才允许被提升。

## Status

Current status: GA-candidate product snapshot. The core trust surfaces, Pi goal-mode loop, adapter contracts, release gates, and public architecture docs are present, but the project must not be described as final GA until a maintainer-run release audit produces replayable public evidence.

当前状态：GA 候选产品快照。当前代码已具备核心信任面、Pi goal-mode 循环、adapter 合约、发布门控和公开架构文档；但在维护者完成 release audit 并产出可 replay 的公开证据前，不应宣称已经 final GA。

Use this wording publicly:

```text
CoMath is a source-available, non-commercially licensed agentic formal mathematics workbench built around Lean4/mathlib. It orchestrates external proof, search, retrieval, computation, and agent tools, and promotes a mathematical claim only after clean Lean replay and integrity audit pass.
```

Forbidden wording:

- CoMath proves arbitrary mathematics by itself.
- CoMath verifies theorem truth independently of Lean.
- CoMath replaces Lean/mathlib.
- CoMath agents, votes, papers, CAS/SMT/SAT, or theorem search certify proofs.

禁止表述：

- CoMath 自己证明任意数学。
- CoMath 独立于 Lean 验证定理真值。
- CoMath 替代 Lean/mathlib。
- CoMath 用 agent 投票、论文、CAS/SMT/SAT 或 theorem search 来认证证明。

## Design Philosophy

The design is intentionally conservative:

- Lean4/mathlib kernel clean replay is the only final mathematical authority.
- `comathd` is the trusted local mutation boundary for `.comath/` runtime state, artifacts, audit logs, campaigns, agent runs, and promotion decisions.
- Pi is a thin interaction layer. It may route commands, ask for confirmation, and display sanitized evidence, but it must not write trusted proof state directly.
- FormalSpecLock, AssumptionLedger, StatementDiffGate, dependency locks, toolchain hashes, artifact hashes, replay manifests, and no-cheat gates preserve statement and assumption boundaries.
- The 1 coordinator + 8 specialist-agent workflow produces proposals, critiques, variants, votes, and blockers. Those outputs are evidence and planning material only, never proof authority.
- External wheels such as theorem search, retrieval, ingestion, CAS/SMT/SAT, and live repair-hint providers are adapters. Their outputs are hints, refutations, or provenance, not proof.
- Terminal states are fail-closed: terminal proof, confirmed counterexample, user-visible statement disambiguation, replayable blocker, or resumable budget exhaustion.

中文设计原则：

- Lean4/mathlib kernel clean replay 是唯一最终数学权威。
- `comathd` 是 `.comath/` 运行时状态、artifact、audit log、campaign、agent run 和 promotion decision 的可信本地变更边界。
- Pi 只是薄交互层。它可以路由命令、请求确认、展示已净化证据，但不能直接写可信 proof state。
- FormalSpecLock、AssumptionLedger、StatementDiffGate、dependency lock、toolchain hash、artifact hash、replay manifest 和 no-cheat gate 用来锁定命题与假设边界。
- 1 个 coordinator + 8 个 specialist agent 的工作流只生成候选、审查、变体、投票和 blocker；这些都只是 evidence/planning material，不是 proof authority。
- theorem search、retrieval、ingestion、CAS/SMT/SAT 和 live repair-hint provider 都通过 adapter 接入；其输出只能作为 hint、refutation 或 provenance。
- 终态必须 fail-closed：terminal proof、confirmed counterexample、用户可见的 statement disambiguation、replayable blocker，或可恢复的 budget exhaustion。

## Architecture

Key directories:

- `services/comathd/`: trusted service boundary, runtime state owner, API routes, proof/replay/release gates.
- `extensions/comath-pi/`: Pi command/tool/resource registration and sanitized public interaction layer.
- `services/comathd/src/proof-kernel/`: formal-spec, campaign, agent-stage, Lean replay, dependency, axiom, and no-cheat machinery.
- `services/comathd/src/adapters/`: external wheel registry contracts.
- `services/comathd/src/release/`: release, audit, certificate, proof-breadth, and source-review gates.
- `config/`: non-secret sample configuration.
- `docs/architecture/`: GA release criteria, threat model, adapter contracts, evidence-pack policy, and module boundaries.
- `.comath/`: runtime state written by `comathd`; ignored by Git and never committed.

中文目录说明：

- `services/comathd/`：可信服务边界，拥有运行时状态、API route、proof/replay/release gate。
- `extensions/comath-pi/`：Pi 命令/工具/资源注册，以及净化后的公开交互层。
- `services/comathd/src/proof-kernel/`：formal spec、campaign、agent-stage、Lean replay、dependency、axiom 与 no-cheat 机制。
- `services/comathd/src/adapters/`：external wheel registry 合约。
- `services/comathd/src/release/`：发布、审计、证书、proof-breadth 与 source-review 门控。
- `config/`：非密钥配置样例。
- `docs/architecture/`：GA release criteria、threat model、adapter contracts、evidence-pack policy 和 module boundaries。
- `.comath/`：由 `comathd` 写入的运行时状态，已被 Git 忽略，禁止提交。

## Deployment

Prerequisites:

- Node.js `>=22.19.0`
- Corepack with `pnpm@11.3.0`
- Lean4/Lake/mathlib for real proof replay paths
- Optional provider credentials and endpoints only when explicitly enabling live adapters

Install and build:

```text
corepack pnpm install
corepack pnpm build
corepack pnpm typecheck
```

Public validation:

```text
corepack pnpm build
corepack pnpm typecheck
```

Focused package validation:

```text
corepack pnpm --filter @comath/comathd build
corepack pnpm --filter @comath/comathd typecheck
corepack pnpm --filter @comath/pi-extension build
corepack pnpm --filter @comath/pi-extension typecheck
```

The public product snapshot intentionally does not ship the maintainers' internal QA suites, evaluation fixtures, local goal ledgers, or development handoff notes. Release maintainers run those internal gates before tagging a public release and publish only product source plus replayable public evidence packs.

中文部署：

- 安装 Node.js `>=22.19.0`。
- 通过 Corepack 使用 `pnpm@11.3.0`。
- 真实 proof replay 路径需要 Lean4/Lake/mathlib。
- 只有显式启用 live adapter 时才配置外部 provider 凭据与 endpoint。
- 运行 `corepack pnpm install`、`corepack pnpm build`、`corepack pnpm typecheck`。
- 公开产品快照不分发维护者内部 QA、evaluation fixture、本地 goal ledger 或开发 handoff。公开验证使用 build/typecheck；发布维护者在打 tag 前运行内部 gate，并只发布产品源码与可 replay 的公开证据包。

### Local HTTP Service

`comathd` is currently exposed as an embeddable service factory rather than a packaged daemon binary. After building, start a local HTTP server by embedding `createComathServer()`:

PowerShell:

```powershell
$env:COMATHD_PORT = "8787"
@'
import { createComathServer } from "./services/comathd/dist/index.js";

const server = createComathServer();
const http = await server.listen(Number(process.env.COMATHD_PORT ?? 8787), "127.0.0.1");
const address = http.address();
const port = typeof address === "object" && address ? address.port : process.env.COMATHD_PORT;
console.log(`comathd listening on http://127.0.0.1:${port}`);
'@ | node --input-type=module
```

POSIX shell:

```sh
COMATHD_PORT=8787 node --input-type=module <<'EOF'
import { createComathServer } from "./services/comathd/dist/index.js";

const server = createComathServer();
const http = await server.listen(Number(process.env.COMATHD_PORT ?? 8787), "127.0.0.1");
const address = http.address();
const port = typeof address === "object" && address ? address.port : process.env.COMATHD_PORT;
console.log(`comathd listening on http://127.0.0.1:${port}`);
EOF
```

中文：当前 `comathd` 以 embeddable service factory 形式暴露，而不是独立 daemon binary。构建后通过 `createComathServer().listen()` 在本机启动 HTTP 服务；生产化部署应由宿主进程管理生命周期、日志、端口和权限。

## Configuration

Keep live secrets out of Git, Pi payloads, and evidence packs. Use environment variables or host-owned secret stores.

Common optional knobs:

- `COMATH_ENABLE_GOAL_MODE_LIVE_REPAIR_HINT_EXECUTION=1`: opt in to live repair-hint execution.
- `COMATH_LIVE_REPAIR_HINT_PROVIDERS`: comma-separated allowlist such as `retrieval:jina_search,theorem_search:loogle,computation:sympy`.
- `COMATH_JINA_SEARCH_BASE_URL` / `COMATH_JINA_API_KEY`: Jina Search-compatible retrieval adapter.
- `COMATH_LOOGLE_SEARCH_BASE_URL` / `COMATH_LOOGLE_API_KEY`: Loogle-compatible theorem-search adapter.
- `COMATH_SYMPY_COMPUTE_BASE_URL` / `COMATH_SYMPY_API_KEY`: SymPy-compatible computation adapter.
- `COMATH_CODEX_CLI_PROGRAM` and `COMATH_CODEX_CLI_PREFIX_ARGS`: service-owned Codex CLI adapter path and fixed prefix args.
- `COMATH_CODEX_API_KEY`, `COMATH_CODEX_API_BASE_URL`, `COMATH_CODEX_API_MODEL`, `COMATH_CODEX_API_MAX_ATTEMPTS`: service-owned Codex API adapter configuration.
- `COMATH_AGENT_ADAPTER_OSISO_*`: service-owned OS-isolation helper, collection-probe, and live-probe handles. See `config/README.md`.

中文配置原则：

- 不要提交真实凭据、API key、私有路径、付费账号细节或用户论文语料。
- Pi 只能看到声明性选项或净化后的引用，不能接收密钥值。
- live retrieval/theorem-search/computation 都必须显式 opt-in，并且结果保持 `proof_authority=none`。
- OS-isolation helper 与 probe 是 host/service 配置，不是 Pi payload，也不是数学证明权威。

## Invocation Modes

### 1. Pi Commands

Pi is the intended interaction layer. Registered command families include:

```text
/cm:research start --goal "..." --paper <path-or-ref> --attach <path> --mode strict
/cm:campaign status <campaign-id>
/cm:campaign tick <campaign-id>
/cm:campaign replay <campaign-id>
/cm:campaign export <campaign-id>
/cm:agent profiles
/cm:agent run <profile-id>
/cm:paper init
/cm:claim get <claim-id>
/cm:release <release-audit-subcommand>
```

Pi commands are thin clients over `comathd`; mutating tools require host confirmation and must not write `.comath/` directly.

中文：Pi 是主要交互层。`/cm:research` 用于 goal-mode 研究闭环；`/cm:campaign` 用于 campaign 状态、tick、replay、export；`/cm:agent` 用于 agent profile 和运行；`/cm:release` 用于发布与审计门控。Pi 命令只调用 `comathd`，变更型工具需要宿主确认，不能直接写 `.comath/`。

### 2. Direct HTTP

When the local service is listening, call JSON routes directly:

```sh
curl -sS -X POST http://127.0.0.1:8787/project/init \
  -H "content-type: application/json" \
  -d '{"name":"demo","root_path":"/absolute/path/to/project"}'

curl -sS -X POST http://127.0.0.1:8787/campaign/start \
  -H "content-type: application/json" \
  -d '{"project_root":"/absolute/path/to/project","user_goal":"Prove in Lean that True.","actor":"operator"}'

curl -sS "http://127.0.0.1:8787/campaign/CAM-0001/status?project_root=/absolute/path/to/project"

curl -sS -X POST http://127.0.0.1:8787/campaign/CAM-0001/tick \
  -H "content-type: application/json" \
  -d '{"project_root":"/absolute/path/to/project","actor":"operator"}'

curl -sS -X POST http://127.0.0.1:8787/campaign/CAM-0001/replay \
  -H "content-type: application/json" \
  -d '{"project_root":"/absolute/path/to/project","actor":"operator"}'
```

中文：本地 HTTP route 适合自动化、脚本和集成测试。所有路径必须使用真实 project root；promotion/release 类 route 仍受 `comathd` 的 fail-closed gate 约束。

### 3. In-Process API

For workers, automation, and host applications, use the injected API without opening a network port:

```js
import { createComathServer } from "./services/comathd/dist/index.js";

const server = createComathServer();
const start = await server.inject({
  method: "POST",
  path: "/campaign/start",
  body: {
    project_root: "/absolute/path/to/project",
    user_goal: "Prove in Lean that True.",
    actor: "automation"
  }
});

console.log(start.status, start.body);
await server.close();
```

中文：`server.inject()` 适合测试和宿主进程内调用，不需要打开端口；它和 HTTP route 使用同一套 `comathd` 路由与门控逻辑。

### 4. Adapter / External Wheel Calls

External tools enter through adapter contracts, not as proof authorities:

- theorem search: Loogle-compatible live repair hints or other theorem-search adapters
- retrieval: Jina Search/Reader-compatible retrieval and literature ingestion
- computation: SymPy-compatible computation, CAS/SMT/SAT hints
- proof replay: Lean/Lake/mathlib only, service-owned and manifest-bound
- agent execution: service-owned profile/package launch with explicit OS-isolation readiness gates

中文：外部工具必须通过 adapter 合约进入系统，只能产生 hint/evidence/refutation/provenance，不能绕过 Lean clean replay 或提升证明声明。

## Proof Promotion Rules

A promoted proof artifact must bind:

- FormalSpecLock and AssumptionLedger hashes
- locked theorem statement and theorem-header hash
- dependency lock with pinned Lean/Lake/mathlib/external repository material
- toolchain and artifact hashes
- service-owned LeanRunManifest records
- static no-cheat scan, dependency closure, axiom profile, and statement-diff evidence
- FinalReplayManifest v3 and a third-party replay command

Without final clean replay, outputs remain `draft`, `hypothesis`, `candidate`, `blocked_with_replayable_certificate`, `counterexample`, or another non-promotional state.

中文：任何 promoted proof artifact 必须绑定 FormalSpecLock、AssumptionLedger、命题/定理头 hash、dependency lock、toolchain/artifact hash、service-owned LeanRunManifest、no-cheat/dependency/axiom/statement-diff evidence、FinalReplayManifest v3 和第三方 replay 命令。没有 final clean replay 的产物只能是 draft/hypothesis/candidate/blocker/counterexample 等非提升状态。

## License

CoMath Pi Lab is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). Non-commercial use, modification, and redistribution are permitted under that license. Commercial use requires a separate license from the licensor.

中文：CoMath Pi Lab 使用 [PolyForm Noncommercial License 1.0.0](LICENSE)。该许可证允许非商用使用、修改和再分发；商用使用需要从许可方另行取得授权。

## Git Hygiene

The public GitHub tree should contain product source, public architecture docs, sample configuration, and runtime prompt assets only. Do not commit generated, local-only, private QA, or maintainer workflow material:

- `.comath/`
- `.tmp/`
- `.worktrees/`
- `node_modules/`
- `dist/`
- `coverage/`
- `.env` / `.env.*`
- local goal/runbook/plan/review ledgers and local handoff notes
- `tests/`, package-local `tests/`, evaluation fixtures, smoke scripts, and maintainer QA runners
- private paper corpora, API keys, provider transcripts, or host-specific paths

Before pushing:

```text
git status -sb
git diff --check
git diff --name-status origin/main..HEAD
git ls-files .comath .tmp .worktrees node_modules dist coverage tests
git ls-files | rg "(^tests/|/tests/|\\.test\\.|phase0-smoke|docs/progress|docs/superpowers/(plans|specs))"
```

中文：GitHub 公开树只应包含产品源码、公开架构文档、配置样例和运行时 prompt 资产。本地 goal/runbook/plan/review 账本、测试集、evaluation fixture、smoke 脚本、内部 QA runner、运行时状态、生成物、私有语料、密钥和 host-specific 路径都不应提交。

## Release Documents

- [GA Release Criteria](docs/architecture/ga-release-criteria.md)
- [Threat Model](docs/architecture/threat-model.md)
- [Adapter Contracts](docs/architecture/adapter-contracts.md)
- [External Lean Supply Chain](docs/architecture/external-lean-supply-chain.md)
- [Evidence Pack Policy](docs/architecture/evidence-pack-policy.md)
- [Module Boundaries](docs/architecture/module-boundaries.md)
- [Config Samples](config/README.md)
- [Contributing](CONTRIBUTING.md)

中文：发布判断以 `docs/architecture/ga-release-criteria.md` 和 `docs/architecture/threat-model.md` 等公开架构/安全文档为准。内部开发 tracker 不作为 GitHub 面向用户的公开入口。README 是入口说明，不替代 release gate。
