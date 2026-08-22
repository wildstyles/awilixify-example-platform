# Awilixify Example Platform

Example platform for Awilixify and Awilixify DevTools, managed as a pnpm
workspace with Turborepo.

## Development

The platform installs Awilixify, its CLI, and DevTools from npm. The DevTools UI
is pulled as a versioned image from GHCR, so no sibling repositories are
required.

Install dependencies and start both services, their DevTools APIs, and the
DevTools UI container:

```sh
pnpm install
pnpm dev
```

To develop against sibling checkouts instead, use the linked flow:

```text
awilixify-workspace/
├── awilixify/
├── awilixify-cli/
├── awilixify-devtools/
├── awilixify-devtools-ui/
└── awilixify-example-platform/
```

```sh
make dev-linked
```

This builds and links the local packages, watches Awilixify core and DevTools,
restarts the services when their linked output changes, and runs the UI from its
local Vite server. Run `pnpm install --force` afterwards to restore the published
npm packages in `node_modules`.

Install or update the Awilixify trace-debugging skill for Codex and Claude:

```sh
pnpm ai:init
```

The command writes the skill to `.agents/skills/awilixify-trace-debugging` for
Codex and `.claude/skills/awilixify-trace-debugging` for Claude Code. Existing
local modifications are preserved unless the underlying installer is run with
`--force`.

Pass the issue or task after the skill invocation:

```text
# Codex
$awilixify-trace-debugging Fix the issue in showcases/trace-debugging/order-insufficient-stock.md

# Claude Code
/awilixify-trace-debugging Fix the issue in showcases/trace-debugging/order-insufficient-stock.md
```

- Orders API: `http://localhost:3000/orders/order-001`
- Orders OpenAPI: `http://localhost:3000/api-docs`
- Orders DevTools API: `http://localhost:3221`
- Warehouse API: `http://localhost:3001/inventory/coffee-beans`
- Warehouse OpenAPI: `http://localhost:3001/api-docs`
- Warehouse DevTools API: `http://localhost:3223`
- DevTools UI: `http://localhost:3222`

The services run in watch mode using the published `@awilixify/devtools`
package. The UI runs from
`ghcr.io/awilixify/awilixify-devtools-ui:0.1.1`. Orders and Warehouse are passed
as UI targets; requests to their DevTools APIs are proxied through the UI
origin.

Run the services without the UI:

```sh
pnpm turbo run dev
```

Run one service:

```sh
pnpm --filter @awilixify-example-platform/orders-api dev
pnpm --filter @awilixify-example-platform/warehouse-api dev
```

Run a one-minute load test against the deployed Orders API to produce metrics,
traces, and logs for the monitoring dashboards (requires `k6`):

```sh
pnpm load:test
```

Override the target or load when needed:

```sh
API_URL=http://localhost:3000 ORDER_ID=order-1001 VUS=5 DURATION=30s pnpm load:test
```

Regenerate all workspace contracts while their source APIs are running:

```sh
pnpm generate
```

Turbo runs the `generate` task in every workspace package that provides it.

Run the published UI container separately:

```sh
docker compose up --detach devtools-ui
docker compose logs --follow devtools-ui
docker compose down
```

The container receives the same targets through `DEVTOOLS_TARGETS`. Their
internal URLs are used only by Nginx and are not exposed to the browser.

## Checks

```sh
pnpm lint
pnpm typecheck
```
