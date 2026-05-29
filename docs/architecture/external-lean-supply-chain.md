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
- FinalReplayManifest binds the dependency lock hash.

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

## Evidence Pack Rule

When redistribution is allowed, include the pinned dependency material or reproducible fetch instructions. When redistribution is not allowed, include hashes, source references, license notes, and replay instructions that require the third party to obtain the dependency under its own terms.

