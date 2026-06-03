#!/usr/bin/env node

function readFlag(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) {
    return null;
  }
  return String(process.argv[index + 1]);
}

function requireField(source, key, label = key) {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`missing ${label}`);
  }
  return value;
}

function fixedBoundary() {
  const provider = readFlag("--provider");
  const runnerId = readFlag("--runner-id");
  const launchId = readFlag("--launch-id");
  const adapter = readFlag("--adapter-id");
  const backend = readFlag("--backend");
  const networkPolicy = readFlag("--network-policy");
  const proofAuthority = readFlag("--proof-authority");

  if (networkPolicy !== "disabled" || proofAuthority !== "none") {
    throw new Error("provider-helper protocol requires disabled network and proof_authority=none");
  }

  return {
    provider: provider ?? requireField(process.env, "COMATH_OS_ISOLATION_PROVIDER", "provider"),
    runner_id: runnerId ?? requireField(process.env, "COMATH_PROVIDER_RUNNER_ID", "runner id"),
    launch_id: launchId ?? requireField(process.env, "COMATH_SANDBOX_LAUNCH_ID", "launch id"),
    adapter: adapter ?? requireField(process.env, "COMATH_ADAPTER_ID", "adapter id"),
    backend: backend ?? requireField(process.env, "COMATH_ADAPTER_BACKEND", "backend"),
    project_id: requireField(process.env, "COMATH_PROJECT_ID", "project id"),
    network_policy: "disabled",
    proof_authority: "none"
  };
}

try {
  const boundary = fixedBoundary();
  if (process.argv.includes("--comath-provider-helper-self-test")) {
    const hostValidationId = readFlag("--host-validation-id");
    process.stdout.write(`${JSON.stringify({
      comath_provider_helper_self_test: true,
      ok: true,
      provider: boundary.provider,
      network_policy: boundary.network_policy,
      proof_authority: boundary.proof_authority,
      adapter: boundary.adapter,
      backend: boundary.backend,
      project_id: boundary.project_id,
      host_validation_id: hostValidationId ?? "",
      runner_id: boundary.runner_id,
      launch_id: boundary.launch_id
    })}\n`);
  } else {
    const helperExecutionId = readFlag("--helper-execution-id");
    process.stdout.write(`${JSON.stringify({
      comath_provider_helper_runtime_attestation: true,
      ok: true,
      provider: boundary.provider,
      network_policy: boundary.network_policy,
      proof_authority: boundary.proof_authority,
      adapter: boundary.adapter,
      backend: boundary.backend,
      project_id: boundary.project_id,
      helper_execution_id: helperExecutionId ?? "",
      runner_id: boundary.runner_id,
      launch_id: boundary.launch_id
    })}\n`);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(2);
}
