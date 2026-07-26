import { RabbitMqModule } from "@awilixify-example-platform/rabbitmq";
import { createModule, type ModuleDef } from "awilixify";

import { InventoryModule } from "../inventory/inventory.module.js";
import { CreateReservationCommandHandler } from "./create-reservation.command.js";
import { ReserveInventoryMessage } from "./dto/reserve-inventory.rabbit-dto.js";
import { ReservationCreatedEvent } from "./events/reservation-created.event.js";
import { ReservationsController } from "./reservations.controller.js";
import { ReservationsService } from "./reservations.service.js";
import { ReserveInventoryRabbitController } from "./reserve-inventory.rabbit-controller.js";

const ReservationsRabbitModule = RabbitMqModule({
	consumer: [ReserveInventoryMessage],
	publisher: {
		reservationCreated: ReservationCreatedEvent,
	},
});

export type ReservationsModuleDef = ModuleDef<{
	imports: [typeof InventoryModule, typeof ReservationsRabbitModule];
	providers: {
		reservationsService: ReservationsService;
	};
	exportKeys: ["reservationsService"];
	commandHandlers: [CreateReservationCommandHandler];
}>;

export type Deps = ReservationsModuleDef["deps"];

export const ReservationsModule = createModule<ReservationsModuleDef>({
	name: "ReservationsModule",
	imports: [InventoryModule, ReservationsRabbitModule],
	controllers: [ReservationsController, ReserveInventoryRabbitController],
	providers: {
		reservationsService: ReservationsService,
	},
	exports: ["reservationsService"],
	commandHandlers: [CreateReservationCommandHandler],
});
