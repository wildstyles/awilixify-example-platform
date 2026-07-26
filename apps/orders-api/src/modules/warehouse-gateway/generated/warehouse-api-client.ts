// Generated from OpenAPI. Do not edit.
import { callsOperation } from "awilixify";
import { getTracePropagationHeaders } from "awilixify/devtools";

import { createReservation as createReservationRequest } from "./warehouse.js";
import { WarehouseOperations } from "./warehouse.operations.js";

function withTracePropagation(
	args: unknown[],
	optionsIndex: number,
): unknown[] {
	const tracedArgs = [...args];
	const options = (tracedArgs[optionsIndex] ?? {}) as {
		headers?: Record<string, string>;
	};

	tracedArgs[optionsIndex] = {
		...options,
		headers: {
			...options.headers,
			...getTracePropagationHeaders(),
		},
	};

	return tracedArgs;
}

export class WarehouseApiClient {
	@callsOperation(WarehouseOperations.createReservation)
	createReservation(
		...args: Parameters<typeof createReservationRequest>
	): ReturnType<typeof createReservationRequest> {
		return createReservationRequest(
			...(withTracePropagation(
				args,
				createReservationRequest.length - 1,
			) as Parameters<typeof createReservationRequest>),
		);
	}
}
