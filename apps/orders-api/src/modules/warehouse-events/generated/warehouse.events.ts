// Generated from AsyncAPI. Do not edit.
import { defineRabbitMessage } from "@awilixify-example-platform/rabbitmq";

export interface ReservationCreatedPayload {
	orderId: string;
	reservationId: string;
}

export const WarehouseEvents = {
	reservationCreated: defineRabbitMessage<ReservationCreatedPayload>({
		exchange: {
			name: "warehouse.events",
			options: {
				autoDelete: false,
				durable: true,
			},
			type: "topic",
		},
		routingKey: "reservation.created.v1",
		serviceName: "warehouse",
		type: "warehouse.reservation-created.v1",
	}),
} as const;
