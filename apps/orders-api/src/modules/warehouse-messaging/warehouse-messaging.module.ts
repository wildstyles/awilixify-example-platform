// Generated once by Awilixify codegen. Safe to customize.
import { RabbitMqModule } from "@awilixify-example-platform/rabbitmq";
import { createModule, type ModuleDef } from "awilixify";

import { WarehouseMessages } from "./generated/warehouse.messages.js";
import { WarehouseMessagingClient } from "./generated/warehouse-messaging.client.js";

const WarehouseMessagingRabbitMqModule = RabbitMqModule({
	publisher: WarehouseMessages,
});

export type WarehouseMessagingModuleDef = ModuleDef<{
	exportKeys: ["warehouseMessagingClient"];
	imports: [typeof WarehouseMessagingRabbitMqModule];
	providers: {
		warehouseMessagingClient: WarehouseMessagingClient;
	};
}>;

export type Deps = WarehouseMessagingModuleDef["deps"];

export const WarehouseMessagingModule =
	createModule<WarehouseMessagingModuleDef>({
		name: "WarehouseMessagingModule",
		imports: [WarehouseMessagingRabbitMqModule],
		providers: {
			warehouseMessagingClient: WarehouseMessagingClient,
		},
		exports: ["warehouseMessagingClient"],
	});
