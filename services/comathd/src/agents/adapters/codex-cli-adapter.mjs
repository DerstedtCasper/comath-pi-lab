const args = process.argv.slice(2);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

if (args.includes("--health")) {
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      version: "phase43-codex-adapter-v1",
      capabilities: ["agent-report", "profile-routing", "proof-authority-none"]
    })}\n`
  );
  process.exit(0);
}

const profile = valueAfter("--profile") ?? process.env.COMATH_AGENT_PROFILE_ID ?? "unknown";
const role = valueAfter("--role") ?? "unknown";
const goal = valueAfter("--goal") ?? "";
const contextPath = valueAfter("--context") ?? "";
const adapterPackage = valueAfter("--adapter-package") ?? process.env.COMATH_ADAPTER_PACKAGE_ID ?? "codex-cli";

if (process.env.COMATH_PROOF_AUTHORITY !== "none") {
  process.stderr.write("COMATH_PROOF_AUTHORITY must be none\n");
  process.exit(12);
}

if (!goal || !contextPath || !profile) {
  process.stderr.write("missing required adapter launch fields\n");
  process.exit(13);
}

process.stdout.write(
  [
    "# Agent Report",
    "",
    "## Input Context",
    `adapter_package: ${adapterPackage}`,
    `profile: ${profile}`,
    `role: ${role}`,
    `context_path: ${contextPath}`,
    "",
    "## Actions Taken",
    "Packaged Codex CLI adapter launcher validated the profile-bound request and emitted a non-authoritative report envelope.",
    "",
    "## Claims Proposed",
    "No trusted claim promotion.",
    "proof_authority: none",
    "",
    "## Evidence Produced",
    "No mathematical evidence. This adapter report is runtime output only.",
    `goal_excerpt: ${goal.slice(0, 240)}`,
    "",
    "## Graph Patch",
    "No GraphPatch authority.",
    "",
    "## Blockers",
    "None reported by packaged adapter launcher.",
    "",
    "## Failed Routes",
    "No proof route certified by this adapter.",
    "",
    "## Self-Review",
    "The adapter package is a controlled launcher surface and does not claim proof authority.",
    "",
    "## Next Actions",
    "Route any useful output through independent review and Lean-backed proof-kernel gates.",
    ""
  ].join("\n")
);
