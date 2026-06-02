# Config Samples

This directory contains non-secret configuration examples. Do not commit live credentials, API keys, private paths, paid-provider account details, or user paper corpora.

Runtime configuration is owned by `comathd`; Pi may select declared options but must not receive secret values.

Adapter OS-isolation provider helpers are configured outside the sample with absolute service-owned executable paths, such as `COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER`. A generic fallback executable handle, `COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER`, may be used only as host configuration when no provider-specific helper variable is set. Optional fixed helper execution asset arguments may be configured as a JSON string array through `COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER_ARGS_JSON`, with `COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON` as the generic fallback args-prefix handle. Provider-specific variables take precedence over fallback variables. These helper paths and prefix arguments are host configuration, not proof evidence, are recorded publicly only by executable hash and args-prefix hash/count, and are never Pi payload fields.
