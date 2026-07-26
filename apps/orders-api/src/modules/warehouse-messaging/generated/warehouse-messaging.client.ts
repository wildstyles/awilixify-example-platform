// Generated from AsyncAPI. Do not edit.

import type {
	MessagePayload,
	RabbitPublisher,
} from "@awilixify-example-platform/rabbitmq";
import { callsOperation } from "awilixify";

import { WarehouseMessages } from "./warehouse.messages.js";

export class WarehouseMessagingClient {
	constructor(
		private readonly rabbitPublisher: RabbitPublisher<typeof WarehouseMessages>,
	) {}

	@callsOperation(WarehouseMessages.reserveInventory)
	reserveInventory(
		payload: MessagePayload<typeof WarehouseMessages.reserveInventory>,
	): Promise<void> {
		return this.rabbitPublisher.publish({
			message: this.rabbitPublisher.messages.reserveInventory,
			payload,
		});
	}
}
