# Awilixify Example Platform

Example platform for Awilixify and Awilixify DevTools, managed as a pnpm
workspace with Turborepo.

## Development

```sh
pnpm install
pnpm dev
```

The API app runs the DevTools API at `http://localhost:3001`. The embedded
DevTools UI is disabled because the UI will run as a separate process.

## Checks

```sh
pnpm lint
pnpm typecheck
```
