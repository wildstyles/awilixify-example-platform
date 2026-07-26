// Generated from AsyncAPI. Do not edit.
import { defineRabbitMessage } from "@awilixify-example-platform/rabbitmq";

export interface ReserveInventoryPayload {
	lines: ReserveInventoryLinesItem[];
	orderId: string;
}

export interface ReserveInventoryLinesItem {
	quantity: number;
	sku: string;
}

export const WarehouseMessages = {
	reserveInventory: defineRabbitMessage<ReserveInventoryPayload>({
		exchange: {
			name: "warehouse.commands",
			options: {
				autoDelete: false,
				durable: true,
			},
			type: "direct",
		},
		routingKey: "inventory.reserve.v1",
		serviceName: "warehouse",
		type: "warehouse.reserve-inventory.v1",
	}),
} as const;
