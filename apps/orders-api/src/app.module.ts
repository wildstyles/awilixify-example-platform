import { RabbitMqAsyncApiDocsModule } from "@awilixify-example-platform/rabbitmq";
import { createModule, type ModuleDef } from "awilixify";

import { HealthModule } from "./integrations/health/health.module.js";
import { FulfillmentModule } from "./modules/fulfillment/fulfillment.module.js";
import { OrdersModule } from "./modules/orders/orders.module.js";

const MessagingDocsModule = RabbitMqAsyncApiDocsModule({
	description:
		"Commands and events produced or consumed by the Orders service.",
	server: {
		description: `${process.env.DEPLOYMENT_ENVIRONMENT ?? "local"} RabbitMQ broker`,
		host: process.env.RABBITMQ_ADVERTISED_HOST ?? "localhost:5673",
	},
	title: "Orders Messaging API",
	version: process.env.IMAGE_VERSION ?? "development",
});

type AppModuleDef = ModuleDef<{
	imports: [
		typeof MessagingDocsModule,
		typeof HealthModule,
		typeof OrdersModule,
		typeof FulfillmentModule,
	];
}>;

export const AppModule = createModule<AppModuleDef>({
	name: "AppModule",
	imports: [MessagingDocsModule, HealthModule, OrdersModule, FulfillmentModule],
});
