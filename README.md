# Awilixify Example Platform

Example platform for Awilixify and Awilixify DevTools, managed as a pnpm
workspace with Turborepo.

## Development

```sh
pnpm install
pnpm dev
```

The API app runs the DevTools API at `http://localhost:3221`.

In another terminal, start the DevTools UI:

```sh
docker compose up -d
```

Open `http://localhost:3222`. To stop the UI:

```sh
docker compose down
```

## Checks

```sh
pnpm lint
pnpm typecheck
```
