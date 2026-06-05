# External Lean Supply Chain

External Lean repositories are useful as references and dependencies, but they cannot enter a final promoted proof until they reach `trusted_replay_dependency`.

## Dependency State Machine

```text
planning_reference
  -> candidate_dependency
  -> approved_dependency
  -> trusted_replay_dependency
```

Only `trusted_replay_dependency` may be imported by final proof artifacts.

## State Requirements

### planning_reference

- Repository or package is named.
- Source URL or local path is recorded.
- Intended mathematical role is described.
- Output remains `proof_authority=none`.

### candidate_dependency

- License or terms are recorded.
- Lean/Lake toolchain compatibility is checked or blocked.
- Commit, tag, or immutable local artifact hash is recorded.
- Import prefixes under consideration are listed.

### approved_dependency

- Commit SHA is pinned.
- `lean-toolchain` and `lake-manifest.json` are captured when applicable.
- Local clean build result is recorded.
- Source hashes and imported modules are recorded.
- Symlink and untracked-file checks pass.

### trusted_replay_dependency

- Dependency appears in DependencyLock.
- Transitive imports are closed.
- License remains compatible with release/export policy.
- Network is disabled during final replay.
- Final clean workspace contains only declared dependency material.
- Campaign-native Mathlib replay has locally materialized `.lake/packages/mathlib` sources whose hashes are captured before final replay allocation.
- Campaign-native Mathlib replay has a host replay diagnostic with service-owned Lean/Lake version probes, expected toolchain match, binary hashes, safe replay arguments, and lakefile-declared build targets captured before final replay allocation.
- FinalReplayManifest binds the dependency lock hash.
- FinalReplayManifest verification keeps dependency-lock file paths inside the clean workspace, recomputes their hashes, binds the toolchain text to `lean-toolchain`, and matches V2 dependency package material before accepting the manifest.

## Fail-Closed Cases

- Unknown license.
- Floating branch reference without commit SHA.
- Missing or mismatched Lean/Lake toolchain.
- Missing manifest hash.
- Untracked imported local file.
- Symlink escape.
- Network fetch during final proof replay.
- Import prefix outside the approved set.
- Agent-generated dependency metadata without service verification.
- Campaign-native Mathlib final replay requests using `campaign_live_mathlib_non_toy` without Task214 dependency-material checks: a Mathlib `require`, pinned mathlib package revision, trusted mathlib4 source URL, recorded non-unknown license, and local `Mathlib` shadowing scan.
- Final clean replay dependency artifacts using the legacy nonempty-file closure instead of Task215 `DependencyClosureV2` content and FinalReplayManifest v3 package revision binding.
- Campaign-native Mathlib final replay requests using `campaign_live_mathlib_non_toy` without Task216 local Mathlib package materialization diagnostics: missing, empty, symlink-bearing, or rootless `.lake/packages/mathlib` material blocks before final replay workspace allocation and remains `proof_authority=none`.
- FinalReplayManifest v3 artifacts whose dependency-lock file paths, hashes, toolchain text, or V2 external revision material no longer match the clean workspace and `dependency_closure.json`.
- Campaign-native Mathlib final replay requests using `campaign_live_mathlib_non_toy` without Task218 host replay availability diagnostics: missing Lean/Lake binaries, failed version probes, Lean toolchain mismatch, unsafe replay arguments, or undeclared build targets block before final replay workspace allocation and remain `proof_authority=none`.

## Evidence Pack Rule

When redistribution is allowed, include the pinned dependency material or reproducible fetch instructions. When redistribution is not allowed, include hashes, source references, license notes, and replay instructions that require the third party to obtain the dependency under its own terms.
