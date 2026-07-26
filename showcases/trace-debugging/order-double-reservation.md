# Placing an order reserves inventory twice

## Report

A single order reserves warehouse stock twice. After one successful
`POST /orders`, the ordered SKU's `availableQuantity` drops by **double** the
ordered quantity and two reservations are created for the same order. An order
should reserve its stock exactly once.

Reproduce against the local example platform:

```sh
# 1. note current stock
curl http://127.0.0.1:3001/inventory/coffee-beans

# 2. place ONE order for 2 units
curl --request POST \
  --url http://127.0.0.1:3000/orders \
  --header 'content-type: application/json' \
  --data '{"customerId":"customer-001","lines":[{"sku":"coffee-beans","quantity":2}]}'

# 3. stock again — availableQuantity has dropped by 4, reservedQuantity is up by 4
curl http://127.0.0.1:3001/inventory/coffee-beans
```

Observed: a 2-unit order lowers `availableQuantity` by 4 and raises
`reservedQuantity` by 4. The `POST /orders` response is a normal `200` placed /
reserved order — the over-reservation is only visible in warehouse stock.

## Acceptance criteria

- A placed order reserves each line's quantity exactly once; stock moves by the
  ordered amount, not a multiple of it.
- A valid order still succeeds and is reported as reserved.
- Do not weaken the warehouse inventory validation.
