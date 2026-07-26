import { createModule, type ModuleDef } from "awilixify";

import { WarehouseEventsModule } from "../warehouse-events/warehouse-events.module.js";
import { FulfillmentWarehouseEventsRabbitController } from "./fulfillment-warehouse-events.rabbit-controller.js";

export type FulfillmentModuleDef = ModuleDef<{
	imports: [typeof WarehouseEventsModule];
}>;

export type Deps = FulfillmentModuleDef["deps"];

export const FulfillmentModule = createModule<FulfillmentModuleDef>({
	name: "FulfillmentModule",
	imports: [WarehouseEventsModule],
	controllers: [FulfillmentWarehouseEventsRabbitController],
});
