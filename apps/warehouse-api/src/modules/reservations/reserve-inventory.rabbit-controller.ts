import {
	type MessagePayload,
	onRabbitMessage,
} from "@awilixify-example-platform/rabbitmq";

import { ReserveInventoryMessage } from "./dto/reserve-inventory.rabbit-dto.js";
import type { Deps } from "./reservations.module.js";

export class ReserveInventoryRabbitController {
	constructor(
		private readonly reservationsService: Deps["reservationsService"],
	) {}

	@onRabbitMessage(ReserveInventoryMessage, {
		queueName: "warehouse.inventory-reservations",
	})
	async reserveInventory(
		payload: MessagePayload<typeof ReserveInventoryMessage>,
	): Promise<void> {
		const reservation =
			await this.reservationsService.createReservation(payload);

		console.log(
			`Reserved inventory for order "${payload.orderId}" as "${reservation.id}"`,
		);
	}
}
