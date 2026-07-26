import { createModule, type ModuleDef } from "awilixify";
import { AsyncApiRegistryModule } from "../asyncapi-registry/asyncapi-registry.module.js";
import { RabbitMqAsyncApiDocsController } from "./asyncapi-docs.controller.js";
import {
	type AsyncApiDocumentOptions,
	RabbitMqAsyncApiDocumentService,
} from "./asyncapi-document.service.js";

type RabbitMqAsyncApiDocsModuleDef = ModuleDef<{
	imports: [typeof AsyncApiRegistryModule];
	providers: {
		rabbitMqAsyncApiDocument: RabbitMqAsyncApiDocumentService;
		rabbitMqAsyncApiDocsOptions: AsyncApiDocumentOptions;
	};
}>;

export type Deps = RabbitMqAsyncApiDocsModuleDef["deps"];

export function RabbitMqAsyncApiDocsModule(options: AsyncApiDocumentOptions) {
	return createModule<RabbitMqAsyncApiDocsModuleDef>(
		{
			name: "RabbitMqAsyncApiDocsModule",
			imports: [AsyncApiRegistryModule],
			controllers: [RabbitMqAsyncApiDocsController],
			providers: {
				rabbitMqAsyncApiDocument: RabbitMqAsyncApiDocumentService,
				rabbitMqAsyncApiDocsOptions: options,
			},
		},
		{ hashNameFrom: options },
	);
}
