import {
	type MessagePayload,
	onRabbitMessage,
} from "@awilixify-example-platform/rabbitmq";

import { WarehouseEvents } from "../warehouse-events/generated/warehouse.events.js";

export class FulfillmentWarehouseEventsRabbitController {
	@onRabbitMessage(WarehouseEvents.reservationCreated, {
		queueName: "orders.fulfillment-updates",
	})
	reservationCreated(
		payload: MessagePayload<typeof WarehouseEvents.reservationCreated>,
	): void {
		console.log("FULLFILLMENT reservationCreated", payload);
	}
}
