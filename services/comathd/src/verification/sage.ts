import { type ComputeRunnerRequest, runPlaceholderRunner } from "./runner-contracts.js";

export function runSagePlaceholder(projectRoot: string, request: ComputeRunnerRequest) {
  return runPlaceholderRunner(projectRoot, "sage-placeholder", request);
}
