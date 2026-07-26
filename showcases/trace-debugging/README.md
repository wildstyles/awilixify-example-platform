# Trace debugging showcase

Two runs, same bug, same unchanged codebase — one denied tracing, one allowed
it. The point is not that only tracing can fix it: a careful reader can. The
point is **evidence vs. guessing** — how many steps, how much certainty, and
whether the fix targets the real cause instead of reconstructing an async call
graph by hand.

Why this bug is a fair test of tracing: the failure is a *runtime* property —
the same operation runs **twice**, once over HTTP and once over RabbitMQ. Call
count and cross-transport duplication cannot be read off the source or seen with
`curl`; they only show up when you correlate the legs of one request. That is
what a trace does and static reading cannot.

## Setup

1. Start the platform: `pnpm dev`.
2. Use a **fresh AI session** for each run.
3. Restart services between runs so state/traces reset.

## Run A — without tracing

```text
Fix the issue in showcases/trace-debugging/order-double-reservation.md. You may read the code and call the HTTP endpoints, but do NOT use Awilixify DevTools or tracing in any form — no DevTools API, no DevTools UI, and do not read any captured trace data, including the .awilixify-devtools/ directories. Adding tests is not needed. The services are already running (`pnpm dev`); do NOT start, restart, or run them yourself — no `pnpm dev`/`pnpm dev:orders`/`pnpm dev:warehouse`/`turbo`/`tsx`/`node src/main.ts`.
```

## Run B — with tracing

```text
# Claude Code
/awilixify-trace-debugging Fix the issue in showcases/trace-debugging/order-double-reservation.md. Adding tests is not needed. The services are already running (`pnpm dev`); do NOT start, restart, or run them yourself.

# Codex
$awilixify-trace-debugging Fix the issue in showcases/trace-debugging/order-double-reservation.md. Adding tests is not needed. The services are already running (`pnpm dev`); do NOT start, restart, or run them yourself.
```

## What to compare

| Signal                        | Run A (no tracing)    | Run B (tracing)           |
| ----------------------------- | --------------------- | ------------------------- |
| Steps to correct diagnosis    | count tool calls      | count tool calls          |
| Evidence behind the fix       | reconstructed by hand | two reserve legs in trace |
| First fix targets real cause? | maybe a decoy         | the duplicate directly    |

The `POST /orders` response is a normal `200`. Reading `placeOrder` shows a
single, correct reservation — the **second** reservation is fired
asynchronously from a different layer, so reading the obvious request path does
not reveal it; Run A must reconstruct the async flow itself. Run B queries one
trace and sees two `ReservationsService.createReservation` legs under a single
`distributedTraceId` — one entered over **HTTP** (`POST /reservations`), one
over **RabbitMQ** (`ReserveInventoryRabbitController.reserveInventory`) — plus
two downstream `createPickList` legs. The duplication and its source are visible
in a single query.

## The correct fix (grading key)

`PlaceOrderCommandHandler.executor` reserves synchronously through
`ordersService.placeOrder` (which calls the warehouse over HTTP) **and then**
also publishes `reserveInventory` to the async pipeline — so the warehouse
reserves the same order twice. The fix is to reserve exactly once: keep a single
reservation path and drop the redundant one. A valid order must still succeed
and be reported as reserved, and the warehouse validation must not be weakened.
