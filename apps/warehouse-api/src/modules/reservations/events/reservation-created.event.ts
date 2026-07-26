import { defineRabbitExchange } from "@awilixify-example-platform/rabbitmq";
import { Type } from "@sinclair/typebox";

const WarehouseEventsExchange = defineRabbitExchange({
	name: "warehouse.events",
	options: { durable: true },
	type: "topic",
});

export const ReservationCreatedEvent = WarehouseEventsExchange.defineMessage({
	payload: Type.Object({
		orderId: Type.String({ minLength: 1 }),
		reservationId: Type.String({ minLength: 1 }),
	}),
	routingKey: "reservation.created.v1",
	type: "warehouse.reservation-created.v1",
});
