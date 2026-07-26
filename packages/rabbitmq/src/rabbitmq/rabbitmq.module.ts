import { createModule, type ModuleDef } from "awilixify";

import { AsyncApiRegistryModule } from "../asyncapi-registry/asyncapi-registry.module.js";
import { RabbitMqRegistryModule } from "../rabbitmq-registry/rabbitmq-registry.module.js";
import { RabbitMessageInitializer } from "./rabbit-message.initializer.js";
import { RabbitPublisher } from "./rabbit-publisher.service.js";
import type {
	RabbitConsumerMessages,
	RabbitPublisherMessages,
} from "./rabbitmq.types.js";

export type RabbitMqModuleConfig<
	TConsumer extends RabbitConsumerMessages = RabbitConsumerMessages,
	TPublisher extends RabbitPublisherMessages = RabbitPublisherMessages,
> = {
	consumer?: TConsumer;
	publisher?: TPublisher;
};

type RabbitMqModuleDef<
	TConsumer extends RabbitConsumerMessages,
	TPublisher extends RabbitPublisherMessages,
> = ModuleDef<{
	exportInitializerKeys: ["onRabbitMessage"];
	exportKeys: ["rabbitPublisher"];
	imports: [typeof RabbitMqRegistryModule, typeof AsyncApiRegistryModule];
	initializers: {
		onRabbitMessage: typeof RabbitMessageInitializer;
	};
	providers: {
		consumableMessages: TConsumer;
		publishableMessages: TPublisher;
		rabbitPublisher: RabbitPublisher<TPublisher>;
	} & Record<string, object>;
}>;

export function RabbitMqModule<
	const TConsumer extends RabbitConsumerMessages = readonly [],
	const TPublisher extends RabbitPublisherMessages = Record<never, never>,
>(config: RabbitMqModuleConfig<TConsumer, TPublisher>) {
	const consumableMessages = (config.consumer ?? []) as unknown as TConsumer;
	const publishableMessages = (config.publisher ?? {}) as TPublisher;

	return createModule<RabbitMqModuleDef<TConsumer, TPublisher>>(
		{
			name: "RabbitMqModule",
			imports: [RabbitMqRegistryModule, AsyncApiRegistryModule],
			providers: {
				consumableMessages,
				publishableMessages,
				rabbitPublisher: {
					eager: true,
					useClass: RabbitPublisher,
				},
			},
			exports: ["rabbitPublisher"],
			initializers: {
				onRabbitMessage: RabbitMessageInitializer,
			},
			initializerExports: ["onRabbitMessage"],
		},
		{ hashNameFrom: config },
	);
}
