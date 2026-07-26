import { createModule, type ModuleDef } from "awilixify";

import { RabbitMqRegistry } from "./rabbitmq-registry.service.js";

export type RabbitMqRegistryModuleDef = ModuleDef<{
	exportKeys: ["rabbitMqRegistry"];
	providers: {
		rabbitMqRegistry: RabbitMqRegistry;
	};
}>;

export const RabbitMqRegistryModule = createModule<RabbitMqRegistryModuleDef>({
	name: "RabbitMqRegistryModule",
	providers: {
		rabbitMqRegistry: {
			dispose: (registry) => registry.close(),
			eager: true,
			useClass: RabbitMqRegistry,
		},
	},
	exports: ["rabbitMqRegistry"],
});
