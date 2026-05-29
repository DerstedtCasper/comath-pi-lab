import { createHash } from "node:crypto";

export type ExternalWheelKind =
  | "theorem_search"
  | "retrieval"
  | "proof_search_backend"
  | "computation"
  | "external_lean_repo";

export type ProofAuthorityNone = "none";

export type AdapterCredentialPolicy = {
  required_credentials: string[];
  configured: boolean;
  exposes_secret_values: false;
  missing_credentials: string[];
};

export type AdapterRateLimitPolicy = {
  default_rpm: number;
  burst: number;
  configured: boolean;
  notes: string;
};

export type AdapterTerms = {
  license_note: string;
  terms_url?: string;
  redistribution_policy: string;
};

export type AdapterCapabilityMetadata = {
  adapter_id: string;
  kind: ExternalWheelKind;
  capabilities: string[];
  credential_policy: AdapterCredentialPolicy;
  rate_limit_policy: AdapterRateLimitPolicy;
};

export type AdapterHealth = {
  adapter_id: string;
  provider: string;
  kind: ExternalWheelKind;
  status: "stubbed" | "available" | "blocked";
  capabilities: string[];
  credential_policy: AdapterCredentialPolicy;
  rate_limit_policy: AdapterRateLimitPolicy;
  proof_authority: ProofAuthorityNone;
  checked_at: string;
  warnings: string[];
};

export type ExternalWheelAdapterDescriptor = {
  id: string;
  kind: ExternalWheelKind;
  provider: string;
  capabilities: string[];
  credential_policy: AdapterCredentialPolicy;
  rate_limit_policy: AdapterRateLimitPolicy;
  terms: AdapterTerms;
  proof_authority: ProofAuthorityNone;
};

export type TheoremSearchQuery = {
  query: string;
  namespace?: string;
  theorem_type?: string;
  proof_state?: string;
  limit?: number;
};

export type TheoremSearchResult = {
  result_id: string;
  adapter_id: string;
  provider: string;
  query_hash: string;
  declaration_name: string;
  declaration_type?: string;
  module?: string;
  import_hint?: string;
  source_url?: string;
  mathlib_revision?: string;
  score?: number;
  retrieved_at: string;
  capability_metadata: AdapterCapabilityMetadata;
  terms: AdapterTerms;
  proof_authority: ProofAuthorityNone;
  can_promote_claim: false;
  promotion_vetoes: string[];
};

export type RetrievalQuery = {
  query: string;
  limit?: number;
  filters?: Record<string, unknown>;
};

export type RetrievalRef = {
  ref: string;
  kind?: string;
};

export type PromptInjectionScan = {
  status: "not_applicable_for_stub" | "pass" | "fail";
  findings: string[];
};

export type RetrievalResult = {
  evidence_id: string;
  adapter_id: string;
  provider: string;
  source_kind: string;
  query_hash: string;
  title: string;
  source_ref: string;
  source_url?: string;
  retrieved_at: string;
  content_sha256: string;
  anchors: Array<Record<string, unknown>>;
  prompt_injection_scan: PromptInjectionScan;
  capability_metadata: AdapterCapabilityMetadata;
  terms: AdapterTerms;
  proof_authority: ProofAuthorityNone;
  can_promote_claim: false;
  promotion_vetoes: string[];
};

export type FetchedDocument = RetrievalResult & {
  body_text: string;
};

export type ProofSearchRequest = {
  locked_statement_hash: string;
  prompt: string;
  context?: Record<string, unknown>;
};

export type ExternalAgentCandidatePack = {
  candidate_id: string;
  adapter_id: string;
  provider: string;
  request_hash: string;
  generated_at: string;
  locked_statement_hash: string;
  lean_files: string[];
  lean_run_manifest_ids: string[];
  summary: string;
  capability_metadata: AdapterCapabilityMetadata;
  terms: AdapterTerms;
  proof_authority: ProofAuthorityNone;
  can_promote_claim: false;
  promotion_vetoes: string[];
};

export type ComputationRequest = {
  task: string;
  expression?: string;
  input?: Record<string, unknown>;
};

export type ComputationAdapterReport = {
  report_id: string;
  adapter_id: string;
  provider: string;
  request_hash: string;
  exactness: "exact_symbolic" | "finite_model" | "numeric" | "sat_smt" | "unknown";
  result: Record<string, unknown>;
  generated_at: string;
  capability_metadata: AdapterCapabilityMetadata;
  terms: AdapterTerms;
  proof_authority: ProofAuthorityNone;
  can_promote_claim: false;
  promotion_vetoes: string[];
};

export type ExternalLeanRepoRequest = {
  ref: string;
  requested_imports?: string[];
};

export type ExternalLeanRepoCandidate = {
  candidate_id: string;
  adapter_id: string;
  provider: string;
  ref_hash: string;
  inspected_at: string;
  ref: string;
  requested_imports: string[];
  state: "planning_reference" | "candidate_dependency" | "approved_dependency" | "trusted_replay_dependency";
  required_checks: string[];
  capability_metadata: AdapterCapabilityMetadata;
  terms: AdapterTerms;
  proof_authority: ProofAuthorityNone;
  can_promote_claim: false;
  promotion_vetoes: string[];
};

export type TheoremSearchAdapter = ExternalWheelAdapterDescriptor & {
  kind: "theorem_search";
  health(): Promise<AdapterHealth>;
  query(input: TheoremSearchQuery): Promise<TheoremSearchResult[]>;
};

export type RetrievalAdapter = ExternalWheelAdapterDescriptor & {
  kind: "retrieval";
  health(): Promise<AdapterHealth>;
  search(input: RetrievalQuery): Promise<RetrievalResult[]>;
  fetch(input: RetrievalRef): Promise<FetchedDocument>;
};

export type ProofSearchBackendAdapter = ExternalWheelAdapterDescriptor & {
  kind: "proof_search_backend";
  sandbox_policy: "local" | "container" | "remote";
  health(): Promise<AdapterHealth>;
  propose(input: ProofSearchRequest): Promise<ExternalAgentCandidatePack>;
};

export type ComputationAdapter = ExternalWheelAdapterDescriptor & {
  kind: "computation";
  exactness: ComputationAdapterReport["exactness"];
  health(): Promise<AdapterHealth>;
  run(input: ComputationRequest): Promise<ComputationAdapterReport>;
};

export type ExternalLeanRepoAdapter = ExternalWheelAdapterDescriptor & {
  kind: "external_lean_repo";
  health(): Promise<AdapterHealth>;
  inspect(input: ExternalLeanRepoRequest): Promise<ExternalLeanRepoCandidate>;
};

export type ExternalWheelAdapter =
  | TheoremSearchAdapter
  | RetrievalAdapter
  | ProofSearchBackendAdapter
  | ComputationAdapter
  | ExternalLeanRepoAdapter;

export type ExternalWheelRegistry = {
  adapters: ExternalWheelAdapter[];
};

type RegistryOptions = {
  now?: () => string;
  credentials?: Record<string, string | undefined>;
  defaultRpm?: number;
};

const NO_AUTHORITY_VETO = "external_adapter_result_has_no_proof_authority";

function nowIso(options: Required<Pick<RegistryOptions, "now">>): string {
  return options.now();
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJson(item));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, sortJson(record[key])]));
  }
  return value;
}

function canonicalHash(value: unknown): string {
  return sha256Text(`${JSON.stringify(sortJson(value))}\n`);
}

function credentialPolicy(provider: string, required: string[], credentials: Record<string, string | undefined>): AdapterCredentialPolicy {
  const missing = required.filter((name) => !credentials[name]);
  return {
    required_credentials: required,
    configured: missing.length === 0,
    exposes_secret_values: false,
    missing_credentials: missing.map((name) => `${provider}:${name}`)
  };
}

function rateLimitPolicy(defaultRpm: number): AdapterRateLimitPolicy {
  return {
    default_rpm: defaultRpm,
    burst: Math.max(1, Math.floor(defaultRpm / 2)),
    configured: true,
    notes: "Registry metadata only; adapters must enforce provider limits before live network calls."
  };
}

function terms(provider: string, licenseNote: string, termsUrl?: string): AdapterTerms {
  return {
    license_note: licenseNote,
    terms_url: termsUrl,
    redistribution_policy: `${provider} output is stored as untrusted evidence metadata unless source terms permit redistribution.`
  };
}

function capabilityMetadata(adapter: ExternalWheelAdapterDescriptor): AdapterCapabilityMetadata {
  return {
    adapter_id: adapter.id,
    kind: adapter.kind,
    capabilities: [...adapter.capabilities],
    credential_policy: { ...adapter.credential_policy, missing_credentials: [...adapter.credential_policy.missing_credentials] },
    rate_limit_policy: { ...adapter.rate_limit_policy }
  };
}

function baseDescriptor(
  kind: ExternalWheelKind,
  provider: string,
  capabilities: string[],
  licenseNote: string,
  options: Required<Pick<RegistryOptions, "credentials" | "defaultRpm">>,
  extra?: { requiredCredentials?: string[]; termsUrl?: string }
): ExternalWheelAdapterDescriptor {
  return {
    id: `${kind}:${provider}`,
    kind,
    provider,
    capabilities,
    credential_policy: credentialPolicy(provider, extra?.requiredCredentials ?? [], options.credentials),
    rate_limit_policy: rateLimitPolicy(options.defaultRpm),
    terms: terms(provider, licenseNote, extra?.termsUrl),
    proof_authority: "none"
  };
}

function health(adapter: ExternalWheelAdapterDescriptor, options: Required<Pick<RegistryOptions, "now">>): Promise<AdapterHealth> {
  return Promise.resolve({
    adapter_id: adapter.id,
    provider: adapter.provider,
    kind: adapter.kind,
    status: "stubbed",
    capabilities: [...adapter.capabilities],
    credential_policy: { ...adapter.credential_policy, missing_credentials: [...adapter.credential_policy.missing_credentials] },
    rate_limit_policy: { ...adapter.rate_limit_policy },
    proof_authority: "none",
    checked_at: nowIso(options),
    warnings: ["network-free stub adapter; live provider integration must preserve proof_authority none"]
  });
}

function createTheoremSearchAdapter(
  provider: string,
  capabilities: string[],
  licenseNote: string,
  options: Required<Pick<RegistryOptions, "now" | "credentials" | "defaultRpm">>,
  termsUrl?: string
): TheoremSearchAdapter {
  const descriptor = baseDescriptor("theorem_search", provider, capabilities, licenseNote, options, { termsUrl });
  return {
    ...descriptor,
    kind: "theorem_search",
    health: () => health(descriptor, options),
    query: async (input) => {
      const query_hash = canonicalHash({ provider, kind: descriptor.kind, input });
      return [
        {
          result_id: `TSR-${query_hash.slice(0, 12)}`,
          adapter_id: descriptor.id,
          provider,
          query_hash,
          declaration_name: input.query,
          declaration_type: input.theorem_type,
          module: input.namespace,
          import_hint: input.namespace,
          source_url: termsUrl,
          mathlib_revision: undefined,
          score: 0,
          retrieved_at: nowIso(options),
          capability_metadata: capabilityMetadata(descriptor),
          terms: descriptor.terms,
          proof_authority: "none",
          can_promote_claim: false,
          promotion_vetoes: [NO_AUTHORITY_VETO]
        }
      ];
    }
  };
}

function createRetrievalAdapter(
  provider: string,
  sourceKind: string,
  capabilities: string[],
  licenseNote: string,
  options: Required<Pick<RegistryOptions, "now" | "credentials" | "defaultRpm">>,
  termsUrl?: string
): RetrievalAdapter {
  const descriptor = baseDescriptor("retrieval", provider, capabilities, licenseNote, options, { termsUrl });
  const makeResult = (input: RetrievalQuery | RetrievalRef): RetrievalResult => {
    const query_hash = canonicalHash({ provider, kind: descriptor.kind, input });
    const source_ref = "query" in input ? input.query : input.ref;
    return {
      evidence_id: `LIT-${query_hash.slice(0, 12)}`,
      adapter_id: descriptor.id,
      provider,
      source_kind: sourceKind,
      query_hash,
      title: `${provider} stub result for ${source_ref}`,
      source_ref,
      source_url: termsUrl,
      retrieved_at: nowIso(options),
      content_sha256: canonicalHash({ provider, source_ref, body: "stub" }),
      anchors: [],
      prompt_injection_scan: { status: "not_applicable_for_stub", findings: [] },
      capability_metadata: capabilityMetadata(descriptor),
      terms: descriptor.terms,
      proof_authority: "none",
      can_promote_claim: false,
      promotion_vetoes: [NO_AUTHORITY_VETO]
    };
  };
  return {
    ...descriptor,
    kind: "retrieval",
    health: () => health(descriptor, options),
    search: async (input) => [makeResult(input)],
    fetch: async (input) => ({ ...makeResult(input), body_text: "" })
  };
}

function createProofSearchBackendAdapter(
  provider: string,
  capabilities: string[],
  licenseNote: string,
  options: Required<Pick<RegistryOptions, "now" | "credentials" | "defaultRpm">>,
  sandbox_policy: ProofSearchBackendAdapter["sandbox_policy"] = "local"
): ProofSearchBackendAdapter {
  const descriptor = baseDescriptor("proof_search_backend", provider, capabilities, licenseNote, options);
  return {
    ...descriptor,
    kind: "proof_search_backend",
    sandbox_policy,
    health: () => health(descriptor, options),
    propose: async (input) => {
      const request_hash = canonicalHash({ provider, kind: descriptor.kind, input });
      return {
        candidate_id: `PSC-${request_hash.slice(0, 12)}`,
        adapter_id: descriptor.id,
        provider,
        request_hash,
        generated_at: nowIso(options),
        locked_statement_hash: input.locked_statement_hash,
        lean_files: [],
        lean_run_manifest_ids: [],
        summary: `${provider} stub candidate; must be checked by service-owned LeanRunner before use.`,
        capability_metadata: capabilityMetadata(descriptor),
        terms: descriptor.terms,
        proof_authority: "none",
        can_promote_claim: false,
        promotion_vetoes: [NO_AUTHORITY_VETO]
      };
    }
  };
}

function createComputationAdapter(
  provider: string,
  exactness: ComputationAdapterReport["exactness"],
  capabilities: string[],
  licenseNote: string,
  options: Required<Pick<RegistryOptions, "now" | "credentials" | "defaultRpm">>
): ComputationAdapter {
  const descriptor = baseDescriptor("computation", provider, capabilities, licenseNote, options);
  return {
    ...descriptor,
    kind: "computation",
    exactness,
    health: () => health(descriptor, options),
    run: async (input) => {
      const request_hash = canonicalHash({ provider, kind: descriptor.kind, input });
      return {
        report_id: `CMP-${request_hash.slice(0, 12)}`,
        adapter_id: descriptor.id,
        provider,
        request_hash,
        exactness,
        result: { status: "stubbed", task: input.task, expression: input.expression ?? null },
        generated_at: nowIso(options),
        capability_metadata: capabilityMetadata(descriptor),
        terms: descriptor.terms,
        proof_authority: "none",
        can_promote_claim: false,
        promotion_vetoes: [NO_AUTHORITY_VETO]
      };
    }
  };
}

function createExternalLeanRepoAdapter(
  provider: string,
  capabilities: string[],
  licenseNote: string,
  options: Required<Pick<RegistryOptions, "now" | "credentials" | "defaultRpm">>
): ExternalLeanRepoAdapter {
  const descriptor = baseDescriptor("external_lean_repo", provider, capabilities, licenseNote, options);
  return {
    ...descriptor,
    kind: "external_lean_repo",
    health: () => health(descriptor, options),
    inspect: async (input) => {
      const ref_hash = canonicalHash({ provider, kind: descriptor.kind, input });
      return {
        candidate_id: `ELR-${ref_hash.slice(0, 12)}`,
        adapter_id: descriptor.id,
        provider,
        ref_hash,
        inspected_at: nowIso(options),
        ref: input.ref,
        requested_imports: [...(input.requested_imports ?? [])],
        state: "planning_reference",
        required_checks: [
          "license_compatible",
          "commit_sha_pinned",
          "lean_toolchain_compatible",
          "lake_manifest_pinned",
          "local_clean_build_pass",
          "no_symlink_escape",
          "network_disabled_final_replay"
        ],
        capability_metadata: capabilityMetadata(descriptor),
        terms: descriptor.terms,
        proof_authority: "none",
        can_promote_claim: false,
        promotion_vetoes: [NO_AUTHORITY_VETO]
      };
    }
  };
}

export function createDefaultExternalWheelRegistry(options: RegistryOptions = {}): ExternalWheelRegistry {
  const resolved = {
    now: options.now ?? (() => new Date().toISOString()),
    credentials: options.credentials ?? {},
    defaultRpm: options.defaultRpm ?? 60
  };

  const adapters: ExternalWheelAdapter[] = [
    createTheoremSearchAdapter("loogle", ["constant_search", "name_search", "subexpression_search"], "Loogle searches Lean/mathlib declarations; results are hints only.", resolved, "https://loogle.lean-lang.org/"),
    createTheoremSearchAdapter("leansearch", ["natural_language_search", "proof_state_search", "premise_retrieval"], "LeanSearch results are premise hints only.", resolved, "https://github.com/leanprover-community/LeanSearchClient"),
    createTheoremSearchAdapter("lean_state_search", ["proof_state_search", "premise_retrieval"], "LeanStateSearch results are proof-state hints only.", resolved, "https://github.com/leanprover-community/LeanSearchClient"),
    createTheoremSearchAdapter("leansearchclient", ["natural_language_search", "proof_state_search", "premise_retrieval"], "LeanSearchClient routes theorem-search providers but remains non-authoritative.", resolved, "https://github.com/leanprover-community/LeanSearchClient"),
    createTheoremSearchAdapter("moogle", ["natural_language_search", "name_search"], "Moogle results are theorem-search hints only.", resolved, "https://www.moogle.ai/"),
    createTheoremSearchAdapter("leanexplore", ["constant_search", "name_search"], "LeanExplore declaration metadata is search evidence only.", resolved, "https://pypi.org/project/lean-explore/"),
    createTheoremSearchAdapter("leandojo", ["premise_retrieval", "proof_state_search"], "LeanDojo traces may guide premise retrieval but cannot certify proofs.", resolved, "https://github.com/lean-dojo/LeanDojo"),

    createRetrievalAdapter("arxiv", "arxiv", ["paper_search"], "arXiv metadata and papers are literature grounding only.", resolved, "https://info.arxiv.org/help/api/user-manual.html"),
    createRetrievalAdapter("semantic_scholar", "paper", ["paper_search", "citation_graph"], "Semantic Scholar metadata is literature grounding only.", resolved, "https://api.semanticscholar.org/api-docs/"),
    createRetrievalAdapter("openalex", "paper", ["paper_search", "citation_graph"], "OpenAlex metadata is literature grounding only.", resolved, "https://developers.openalex.org/"),
    createRetrievalAdapter("crossref", "doi", ["doi_metadata"], "Crossref metadata is literature grounding only.", resolved, "https://www.crossref.org/documentation/retrieve-metadata/rest-api/"),
    createRetrievalAdapter("unpaywall", "doi", ["open_access_pdf", "doi_metadata"], "Unpaywall metadata is literature grounding only.", resolved, "https://unpaywall.org/products/api"),
    createRetrievalAdapter("jina_reader", "html", ["url_to_markdown"], "Jina Reader output is extracted document evidence only.", resolved, "https://jina.ai/reader/"),
    createRetrievalAdapter("jina_search", "html", ["paper_search", "url_to_markdown"], "Jina Search output is retrieval evidence only.", resolved, "https://jina.ai/reader/"),
    createRetrievalAdapter("anysearch", "html", ["paper_search", "url_to_markdown"], "AnySearch output is retrieval evidence only.", resolved, "https://github.com/anysearch-ai/anysearch-skill"),
    createRetrievalAdapter("local_pdf", "pdf", ["pdf_text", "local_ingestion"], "Local PDF ingestion depends on user-provided material and remains evidence only.", resolved),
    createRetrievalAdapter("local_tex", "tex", ["tex_source", "local_ingestion"], "Local TeX ingestion remains evidence only.", resolved),
    createRetrievalAdapter("local_markdown", "local_file", ["local_ingestion", "url_to_markdown"], "Local Markdown ingestion remains evidence only.", resolved),
    createRetrievalAdapter("bibtex", "bibliography", ["doi_metadata", "local_ingestion"], "BibTeX metadata is citation metadata only.", resolved),

    createProofSearchBackendAdapter("leandojo", ["proof_state_feedback", "premise_retrieval", "tactic_suggestion"], "LeanDojo proposals require CoMath LeanRunner replay.", resolved),
    createProofSearchBackendAdapter("lean_copilot", ["tactic_suggestion", "whole_file_generation"], "LeanCopilot suggestions require CoMath LeanRunner replay.", resolved),
    createProofSearchBackendAdapter("aesop", ["tactic_suggestion", "error_repair"], "Aesop/tactic output is executable Lean guidance only before replay.", resolved),
    createProofSearchBackendAdapter("codex", ["whole_file_generation", "lemma_generation", "error_repair"], "Model output is untrusted candidate text only.", resolved, "remote"),

    createComputationAdapter("sympy", "exact_symbolic", ["exact_computation", "symbolic_exploration"], "SymPy output is supporting evidence unless formalized and replayed in Lean.", resolved),
    createComputationAdapter("sage", "exact_symbolic", ["exact_computation", "symbolic_exploration"], "Sage output is supporting evidence unless formalized and replayed in Lean.", resolved),
    createComputationAdapter("z3", "sat_smt", ["finite_model", "sat_smt"], "Z3 output is support/refutation lead only unless certified in Lean.", resolved),
    createComputationAdapter("cvc5", "sat_smt", ["finite_model", "sat_smt"], "cvc5 output is support/refutation lead only unless certified in Lean.", resolved),

    createExternalLeanRepoAdapter("local_lean_repo", ["local_dependency_inspection", "import_planning"], "Local Lean repos must be pinned and replay-gated before trusted import.", resolved),
    createExternalLeanRepoAdapter("mathlib4", ["external_dependency_inspection", "import_planning"], "mathlib is the default Lean library but must still be dependency-locked.", resolved),
    createExternalLeanRepoAdapter("external_git_lean_repo", ["external_dependency_inspection", "import_planning"], "External Lean repos require license, commit, toolchain, manifest, and clean-build checks.", resolved)
  ];

  return { adapters };
}

export function listExternalWheelAdapters(registry: ExternalWheelRegistry): ExternalWheelAdapterDescriptor[] {
  return registry.adapters.map((adapter) => ({
    id: adapter.id,
    kind: adapter.kind,
    provider: adapter.provider,
    capabilities: [...adapter.capabilities],
    credential_policy: { ...adapter.credential_policy, missing_credentials: [...adapter.credential_policy.missing_credentials] },
    rate_limit_policy: { ...adapter.rate_limit_policy },
    terms: { ...adapter.terms },
    proof_authority: "none"
  }));
}

export function getExternalWheelAdapter<K extends ExternalWheelKind>(
  registry: ExternalWheelRegistry,
  kind: K,
  provider: string
): Extract<ExternalWheelAdapter, { kind: K }> {
  const adapter = registry.adapters.find((candidate) => candidate.kind === kind && candidate.provider === provider);
  if (!adapter) {
    throw new Error(`external wheel adapter not found: ${kind}:${provider}`);
  }
  return adapter as Extract<ExternalWheelAdapter, { kind: K }>;
}
