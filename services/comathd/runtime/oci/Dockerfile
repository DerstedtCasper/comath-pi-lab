# Build only the worker-side service MCP entrypoint and a pinned Codex CLI.
# The image contains no project root, runtime state, login data, or provider key.
FROM node:22.22.0-bookworm-slim AS build
WORKDIR /build
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/comathd/package.json services/comathd/package.json
RUN corepack pnpm install --frozen-lockfile --filter @comath/comathd...
COPY services/comathd services/comathd
RUN corepack pnpm --filter @comath/comathd build \
    && corepack pnpm --filter @comath/comathd deploy --prod /opt/comath

FROM node:22.22.0-bookworm-slim
RUN npm install --global --ignore-scripts @openai/codex@0.153.4 \
    && groupadd --gid 10001 comath \
    && useradd --uid 10001 --gid 10001 --create-home --shell /usr/sbin/nologin comath
COPY --from=build /opt/comath /opt/comath
USER 10001:10001
WORKDIR /work
ENTRYPOINT ["/usr/local/bin/codex"]
