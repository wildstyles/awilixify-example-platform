import { RabbitMqAsyncApiDocsModule } from "@awilixify-example-platform/rabbitmq";
import { createModule, type ModuleDef } from "awilixify";

import { FulfillmentModule } from "./modules/fulfillment/fulfillment.module.js";
import { OrdersModule } from "./modules/orders/orders.module.js";

const MessagingDocsModule = RabbitMqAsyncApiDocsModule({
	description:
		"Commands and events produced or consumed by the Orders service.",
	server: {
		description: "Local RabbitMQ broker",
		host: "localhost:5673",
	},
	title: "Orders Messaging API",
	version: "1.0.0",
});

type AppModuleDef = ModuleDef<{
	imports: [
		typeof MessagingDocsModule,
		typeof OrdersModule,
		typeof FulfillmentModule,
	];
}>;

export const AppModule = createModule<AppModuleDef>({
	name: "AppModule",
	imports: [MessagingDocsModule, OrdersModule, FulfillmentModule],
});
