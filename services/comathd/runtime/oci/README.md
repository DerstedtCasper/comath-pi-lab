# OCI research worker image

Build this Dockerfile outside a research campaign, record the resulting immutable image digest, and configure that digest in `research.runtimes.<id>.oci.image_id`. The service refuses mutable image tags.

The runtime mounts only a generation workspace at `/work` (read/write), its materialized ContextPack at `/context` (read-only), and its private Codex home at `/runtime/codex` (read/write). It starts `/usr/local/bin/codex app-server` with a fixed MCP entrypoint at `/opt/comath/dist/control/worker-mcp.js`.

The configured numeric `container_user` must be able to write the host-provided generation workspace and runtime-home bind mounts. The worker gateway must listen on a container-reachable address (`0.0.0.0` or `::`); the service maps it to `host.docker.internal` and on Linux adds Docker's `host-gateway` mapping. Docker engine/image/live isolation evidence remains a separate acceptance lane.
