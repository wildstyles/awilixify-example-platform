import {
	type MessagePayload,
	onRabbitMessage,
	type RabbitMessageContext,
} from "@awilixify-example-platform/rabbitmq";

import { ReservationCreatedEvent } from "../reservations/events/reservation-created.event.js";
import type { Deps } from "./picking.module.js";

export class PickingRabbitController {
	constructor(
		private readonly pickingService: Deps["pickingService"],
		private readonly logger: Deps["logger"],
	) {}

	@onRabbitMessage(ReservationCreatedEvent, {
		queueName: "warehouse.pick-lists",
	})
	createPickList(
		payload: MessagePayload<typeof ReservationCreatedEvent>,
		context: RabbitMessageContext,
	): void {
		const pickList = this.pickingService.createPickList(payload.reservationId);

		const details = {
			order_id: payload.orderId,
			pick_list_id: pickList.id,
			redelivered: context.redelivered,
			routing_key: context.routingKey,
		};
		if (context.redelivered) {
			this.logger.warn(details, "Created pick list from redelivered message");
			return;
		}

		this.logger.info(details, "Pick list created");
	}
}
