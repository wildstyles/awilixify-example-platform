import {
	type MessagePayload,
	onRabbitMessage,
	type RabbitMessageContext,
} from "@awilixify-example-platform/rabbitmq";

import { ReservationCreatedEvent } from "../reservations/events/reservation-created.event.js";
import type { Deps } from "./picking.module.js";

export class PickingRabbitController {
	constructor(private readonly pickingService: Deps["pickingService"]) {}

	@onRabbitMessage(ReservationCreatedEvent, {
		queueName: "warehouse.pick-lists",
	})
	createPickList(
		payload: MessagePayload<typeof ReservationCreatedEvent>,
		context: RabbitMessageContext,
	): void {
		const pickList = this.pickingService.createPickList(payload.reservationId);

		console.log(
			`Created pick list "${pickList.id}" for order "${payload.orderId}"` +
				` (routingKey "${context.routingKey}", redelivered: ${context.redelivered})`,
		);
	}
}
