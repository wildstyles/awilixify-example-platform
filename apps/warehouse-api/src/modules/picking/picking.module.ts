import { RabbitMqModule } from "@awilixify-example-platform/rabbitmq";
import { createModule, type ModuleDef } from "awilixify";
import { ReservationCreatedEvent } from "../reservations/events/reservation-created.event.js";
import { PickingRabbitController } from "./picking.rabbit-controller.js";
import { PickingService } from "./picking.service.js";

const PickingRabbitModule = RabbitMqModule({
	consumer: [ReservationCreatedEvent],
});

export type PickingModuleDef = ModuleDef<{
	imports: [typeof PickingRabbitModule];
	providers: {
		pickingService: PickingService;
	};
	exportKeys: ["pickingService"];
}>;

export type Deps = PickingModuleDef["deps"];

export const PickingModule = createModule<PickingModuleDef>({
	name: "PickingModule",
	imports: [PickingRabbitModule],
	controllers: [PickingRabbitController],
	providers: {
		pickingService: PickingService,
	},
	exports: ["pickingService"],
});
