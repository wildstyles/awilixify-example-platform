import { createModule, type ModuleDef } from "awilixify";
import { RabbitMqOperationRegistry } from "./rabbitmq-operation.registry.js";

export type AsyncApiRegistryModuleDef = ModuleDef<{
	exportKeys: ["rabbitMqAsyncApiOperations"];
	providers: {
		rabbitMqAsyncApiOperations: RabbitMqOperationRegistry;
	};
}>;

export const AsyncApiRegistryModule = createModule<AsyncApiRegistryModuleDef>({
	name: "AsyncApiRegistryModule",
	providers: {
		rabbitMqAsyncApiOperations: RabbitMqOperationRegistry,
	},
	exports: ["rabbitMqAsyncApiOperations"],
});
