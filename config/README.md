# Config Samples

This directory contains non-secret configuration examples. Do not commit live credentials, API keys, private paths, paid-provider account details, or user paper corpora.

Runtime configuration is owned by `comathd`; Pi may select declared options but must not receive secret values.

Adapter OS-isolation provider helpers are configured outside the sample with absolute service-owned executable paths, such as `COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER`. Optional fixed helper execution asset arguments may be configured as a JSON string array through `COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER_ARGS_JSON`. These helper paths and prefix arguments are host configuration, not proof evidence, are recorded publicly only by hash/count, and are never Pi payload fields.
