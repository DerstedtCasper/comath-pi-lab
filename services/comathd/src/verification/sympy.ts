import { type ComputeRunnerRequest, runPythonRunner } from "./runner-contracts.js";

export function runSympyExact(projectRoot: string, request: ComputeRunnerRequest) {
  return runPythonRunner(projectRoot, "sympy-exact", request);
}

export function runCounterexampleSearch(projectRoot: string, request: ComputeRunnerRequest) {
  return runPythonRunner(projectRoot, "counterexample-search", request);
}
