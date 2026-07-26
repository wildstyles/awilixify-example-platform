import { createModule, type ModuleDef } from "awilixify";

import { PickingModule } from "../picking/picking.module.js";
import { CreateShipmentCommandHandler } from "./create-shipment.command.js";
import { ShippingController } from "./shipping.controller.js";
import { ShippingService } from "./shipping.service.js";

export type ShippingModuleDef = ModuleDef<{
	imports: [typeof PickingModule];
	providers: {
		shippingService: ShippingService;
	};
	commandHandlers: [CreateShipmentCommandHandler];
}>;

export type Deps = ShippingModuleDef["deps"];

export const ShippingModule = createModule<ShippingModuleDef>({
	name: "ShippingModule",
	imports: [PickingModule],
	controllers: [ShippingController],
	providers: {
		shippingService: ShippingService,
	},
	commandHandlers: [CreateShipmentCommandHandler],
});
