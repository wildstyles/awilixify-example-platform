import { RabbitMqAsyncApiDocsModule } from "@awilixify-example-platform/rabbitmq";
import { createModule, type ModuleDef } from "awilixify";

import { HealthModule } from "./integrations/health/health.module.js";
import { InventoryModule } from "./modules/inventory/inventory.module.js";
import { PickingModule } from "./modules/picking/picking.module.js";
import { ReservationsModule } from "./modules/reservations/reservations.module.js";
import { ShippingModule } from "./modules/shipping/shipping.module.js";

const MessagingDocsModule = RabbitMqAsyncApiDocsModule({
	description:
		"Commands and events produced or consumed by the Warehouse service.",
	server: {
		description: `${process.env.DEPLOYMENT_ENVIRONMENT ?? "local"} RabbitMQ broker`,
		host: `${process.env.RABBITMQ_HOST ?? "localhost"}:${process.env.RABBITMQ_PORT ?? "5673"}`,
	},
	title: "Warehouse Messaging API",
	version: process.env.IMAGE_VERSION ?? "development",
});

type AppModuleDef = ModuleDef<{
	imports: [
		typeof MessagingDocsModule,
		typeof HealthModule,
		typeof InventoryModule,
		typeof ReservationsModule,
		typeof PickingModule,
		typeof ShippingModule,
	];
}>;

export const AppModule = createModule<AppModuleDef>({
	name: "AppModule",
	imports: [
		MessagingDocsModule,
		HealthModule,
		InventoryModule,
		ReservationsModule,
		PickingModule,
		ShippingModule,
	],
});
