# Config Samples

This directory contains non-secret configuration examples. Do not commit live credentials, API keys, private paths, paid-provider account details, or user paper corpora.

Runtime configuration is owned by `comathd`; Pi may select declared options but must not receive secret values.

Adapter OS-isolation provider helpers are configured outside the sample with absolute service-owned executable paths, such as `COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER`. These helper paths are host configuration, not proof evidence, and are never Pi payload fields.
