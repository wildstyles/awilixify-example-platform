import { defineRabbitExchange } from "@awilixify-example-platform/rabbitmq";
import { Type } from "@sinclair/typebox";

const WarehouseCommandsExchange = defineRabbitExchange({
	name: "warehouse.commands",
	options: { durable: true },
	type: "direct",
});

export const ReserveInventoryMessage = WarehouseCommandsExchange.defineMessage({
	payload: Type.Object({
		lines: Type.Array(
			Type.Object({
				quantity: Type.Integer({ minimum: 1 }),
				sku: Type.String({ minLength: 1 }),
			}),
			{ minItems: 1 },
		),
		orderId: Type.String({ minLength: 1 }),
	}),
	routingKey: "inventory.reserve.v1",
	type: "warehouse.reserve-inventory.v1",
});
