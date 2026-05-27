import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluateTriviumTargetPlatform, initProject } from "../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-trivium-target-eval-"));

try {
  initProject({ name: "Trivium Target Evaluation", root_path: projectRoot });
  const report = await evaluateTriviumTargetPlatform({
    projectRoot,
    projectId: "PRJ-0001",
    sampleSize: Number(process.env.COMATH_TRIVIUM_EVAL_SAMPLE_SIZE ?? 64),
    minSearchTopHitRatio: Number(process.env.COMATH_TRIVIUM_EVAL_MIN_TOP_HIT_RATIO ?? 0.95),
    maxUpsertMsPerNode: Number(process.env.COMATH_TRIVIUM_EVAL_MAX_UPSERT_MS_PER_NODE ?? 250),
    requireNative: true
  });

  console.log(JSON.stringify(report, null, 2));
  if (report.result !== "pass") {
    process.exitCode = 1;
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}
