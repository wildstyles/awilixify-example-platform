# Awilixify Example Platform

Example platform for Awilixify and Awilixify DevTools, managed as a pnpm
workspace with Turborepo.

## Development

Install dependencies and start the API with the DevTools UI:

```sh
pnpm install
pnpm dev
```

- Application API: `http://localhost:3000/api/status`
- Application OpenAPI: `http://localhost:3000/api-docs`
- DevTools API: `http://localhost:3221`
- DevTools OpenAPI: `http://localhost:3221/api-docs`
- DevTools UI: `http://localhost:3222`

The API runs locally with watch mode. The UI runs from
`ghcr.io/wildstyles/awilixify-devtools-ui:0.1.0` through Docker Compose and
proxies its `/__devtools` requests to the local API.

Run only the API:

```sh
pnpm dev:api
```

Manage the UI container separately:

```sh
pnpm ui:up
pnpm ui:logs
pnpm ui:down
```

## Checks

```sh
pnpm lint
pnpm typecheck
```
