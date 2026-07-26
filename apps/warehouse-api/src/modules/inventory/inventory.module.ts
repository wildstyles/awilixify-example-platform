import { createModule, type ModuleDef } from "awilixify";

import { GetStockQueryHandler } from "./get-stock.query.js";
import { InventoryController } from "./inventory.controller.js";
import { InventoryService } from "./inventory.service.js";

export type InventoryModuleDef = ModuleDef<{
	providers: {
		inventoryService: InventoryService;
	};
	exportKeys: ["inventoryService"];
	queryHandlers: [GetStockQueryHandler];
}>;

export type Deps = InventoryModuleDef["deps"];

export const InventoryModule = createModule<InventoryModuleDef>({
	name: "InventoryModule",
	controllers: [InventoryController],
	providers: {
		inventoryService: InventoryService,
	},
	exports: ["inventoryService"],
	queryHandlers: [GetStockQueryHandler],
});
