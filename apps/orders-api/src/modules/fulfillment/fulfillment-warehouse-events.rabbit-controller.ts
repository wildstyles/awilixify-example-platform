import {
	type MessagePayload,
	onRabbitMessage,
} from "@awilixify-example-platform/rabbitmq";

import { WarehouseEvents } from "../warehouse-events/generated/warehouse.events.js";
import type { Deps } from "./fulfillment.module.js";

export class FulfillmentWarehouseEventsRabbitController {
	constructor(private readonly logger: Deps["logger"]) {}

	@onRabbitMessage(WarehouseEvents.reservationCreated, {
		queueName: "orders.fulfillment-updates",
	})
	reservationCreated(
		payload: MessagePayload<typeof WarehouseEvents.reservationCreated>,
	): void {
		this.logger.info(
			{ order_id: payload.orderId, reservation_id: payload.reservationId },
			"Inventory reservation confirmed",
		);
	}
}
