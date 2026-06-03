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

function requireFlag(name) {
  const value = readFlag(name);
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`missing ${name}`);
  }
  return value;
}

function requireBoundary() {
  const networkPolicy = requireFlag("--network-policy");
  const proofAuthority = requireFlag("--proof-authority");
  if (networkPolicy !== "disabled" || proofAuthority !== "none") {
    throw new Error("provider-helper collection probe requires disabled network and proof_authority=none");
  }
  return {
    provider: readFlag("--provider") ?? requireField(process.env, "COMATH_OS_ISOLATION_PROVIDER", "provider"),
    runner_id: readFlag("--runner-id") ?? requireField(process.env, "COMATH_PROVIDER_RUNNER_ID", "runner id"),
    launch_id: readFlag("--launch-id") ?? requireField(process.env, "COMATH_SANDBOX_LAUNCH_ID", "launch id"),
    adapter: readFlag("--adapter-id") ?? requireField(process.env, "COMATH_ADAPTER_ID", "adapter id"),
    backend: readFlag("--backend") ?? requireField(process.env, "COMATH_ADAPTER_BACKEND", "backend"),
    project_id: requireField(process.env, "COMATH_PROJECT_ID", "project id"),
    network_policy: "disabled",
    proof_authority: "none"
  };
}

try {
  const boundary = requireBoundary();
  process.stdout.write(`${JSON.stringify({
    comath_provider_helper_collection_probe: true,
    ok: true,
    provider: boundary.provider,
    network_policy: boundary.network_policy,
    proof_authority: boundary.proof_authority,
    adapter: boundary.adapter,
    backend: boundary.backend,
    project_id: boundary.project_id,
    collection_id: requireFlag("--collection-id"),
    helper_execution_id: requireFlag("--helper-execution-id"),
    runner_id: boundary.runner_id,
    launch_id: boundary.launch_id,
    helper_exit_code: Number(requireFlag("--helper-exit-code")),
    stdout_sha256: requireFlag("--stdout-sha256"),
    stderr_sha256: requireFlag("--stderr-sha256"),
    transcript_sha256: requireFlag("--transcript-sha256"),
    host_validation_id: requireFlag("--host-validation-id"),
    host_validation_path: requireFlag("--host-validation-path"),
    host_validation_sha256: requireFlag("--host-validation-sha256"),
    host_capability_probe_id: requireFlag("--host-capability-probe-id"),
    host_capability_probe_path: requireFlag("--host-capability-probe-path"),
    host_capability_probe_sha256: requireFlag("--host-capability-probe-sha256"),
    host_capability_status: requireFlag("--host-capability-status"),
    provider_host_capability_bound: requireFlag("--provider-host-capability-bound") === "true",
    collection_source: "service_owned_os_probe",
    process_isolation_enforced: false,
    filesystem_scope_enforced: false,
    network_isolation_enforced: false,
    no_new_privileges: false,
    escape_prevention: false
  })}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(2);
}
