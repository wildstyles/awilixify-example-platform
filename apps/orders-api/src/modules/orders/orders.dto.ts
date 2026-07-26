import { type Static, Type } from "@sinclair/typebox";
import { HttpStatus } from "awilixify/http";

export const OrderLineInputSchema = Type.Object({
	quantity: Type.Integer({ minimum: 1 }),
	sku: Type.String({ minLength: 1 }),
});

export const OrderResponseSchema = Type.Object({
	customerId: Type.String(),
	fulfillmentStatus: Type.Union([
		Type.Literal("pending"),
		Type.Literal("reserved"),
	]),
	id: Type.String(),
	lines: Type.Array(
		Type.Object({
			name: Type.String(),
			quantity: Type.Integer({ minimum: 1 }),
			sku: Type.String(),
			unitPrice: Type.Number({ minimum: 0 }),
		}),
	),
	reservationId: Type.Optional(Type.String()),
	status: Type.Literal("placed"),
	total: Type.Number({ minimum: 0 }),
});

export const GetOrderParamsSchema = Type.Object({
	id: Type.String({ minLength: 1 }),
});

export const GetOrderSchema = {
	params: GetOrderParamsSchema,
	response: {
		[HttpStatus.OK]: OrderResponseSchema,
	},
};

export const PlaceOrderBodySchema = Type.Object({
	customerId: Type.String({ minLength: 1 }),
	lines: Type.Array(OrderLineInputSchema, { minItems: 1 }),
});

export const PlaceOrderSchema = {
	body: PlaceOrderBodySchema,
	response: {
		[HttpStatus.OK]: OrderResponseSchema,
	},
};

export const QueueInventoryReservationBodySchema = Type.Object({
	lines: Type.Array(OrderLineInputSchema, { minItems: 1 }),
});

export const QueueInventoryReservationParamsSchema = Type.Object({
	id: Type.String({ minLength: 1 }),
});

export const QueueInventoryReservationResponseSchema = Type.Object({
	orderId: Type.String(),
	status: Type.Literal("queued"),
});

export const QueueInventoryReservationSchema = {
	body: QueueInventoryReservationBodySchema,
	params: QueueInventoryReservationParamsSchema,
	response: {
		[HttpStatus.OK]: QueueInventoryReservationResponseSchema,
	},
};

export type GetOrderParams = Static<typeof GetOrderParamsSchema>;
export type OrderResponse = Static<typeof OrderResponseSchema>;
export type PlaceOrderBody = Static<typeof PlaceOrderBodySchema>;
