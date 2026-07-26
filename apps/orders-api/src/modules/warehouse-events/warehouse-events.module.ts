// Generated once by Awilixify codegen. Safe to customize.
import { RabbitMqModule } from "@awilixify-example-platform/rabbitmq";

import { WarehouseEvents } from "./generated/warehouse.events.js";

export const WarehouseEventsModule = RabbitMqModule({
	consumer: Object.values(WarehouseEvents),
});
