// Generated once by Awilixify codegen. Safe to customize.
import { createModule, type ModuleDef } from "awilixify";

import { WarehouseApiClient } from "./generated/warehouse-api-client.js";

export type WarehouseGatewayModuleDef = ModuleDef<{
	providers: {
		warehouseApiClient: WarehouseApiClient;
	};
	exportKeys: ["warehouseApiClient"];
}>;

export type Deps = WarehouseGatewayModuleDef["deps"];

export const WarehouseGatewayModule = createModule<WarehouseGatewayModuleDef>({
	name: "WarehouseGatewayModule",
	providers: {
		warehouseApiClient: WarehouseApiClient,
	},
	exports: ["warehouseApiClient"],
});
