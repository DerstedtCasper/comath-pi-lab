import { type ComputeRunnerRequest, runPlaceholderRunner } from "./runner-contracts.js";

export function runSatPlaceholder(projectRoot: string, request: ComputeRunnerRequest) {
  return runPlaceholderRunner(projectRoot, "sat-placeholder", request);
}
