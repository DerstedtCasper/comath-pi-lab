# CoMath Pi Lab Phase 0 Design

## Scope

Phase 0 creates the repository skeleton and executable development contract. It deliberately avoids all research-runtime behavior.

## Architecture

The repository is a pnpm monorepo with root documentation, a placeholder Pi extension area, schema area, and a `services/comathd` TypeScript package. Later phases will add contracts, service routes, adapters, runners, and Pi package integration.

## Boundaries

Runtime data is excluded through `.gitignore`. `D:\MATH _Studio\math_studio` is not part of this bootstrap. External systems are recorded as integration assumptions, not imported or executed.

## Validation

Phase 0 must pass install, build, typecheck, and smoke test commands. The smoke test checks that required files and directories exist, so the test is not a pure placeholder.

