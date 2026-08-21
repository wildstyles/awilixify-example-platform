import {
	type MessagePayload,
	onRabbitMessage,
} from "@awilixify-example-platform/rabbitmq";

import { ReserveInventoryMessage } from "./dto/reserve-inventory.rabbit-dto.js";
import type { Deps } from "./reservations.module.js";

export class ReserveInventoryRabbitController {
	constructor(
		private readonly reservationsService: Deps["reservationsService"],
		private readonly logger: Deps["logger"],
	) {}

	@onRabbitMessage(ReserveInventoryMessage, {
		queueName: "warehouse.inventory-reservations",
	})
	async reserveInventory(
		payload: MessagePayload<typeof ReserveInventoryMessage>,
	): Promise<void> {
		const reservation =
			await this.reservationsService.createReservation(payload);

		this.logger.info(
			{ order_id: payload.orderId, reservation_id: reservation.id },
			"Inventory reserved",
		);
	}
}
