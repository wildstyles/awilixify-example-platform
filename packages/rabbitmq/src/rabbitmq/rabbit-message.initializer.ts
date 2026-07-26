import { Initializer, type InitializerContext } from "awilixify";
import type { RabbitMqOperationRegistry } from "../asyncapi-registry/rabbitmq-operation.registry.js";
import type { RabbitMqRegistry } from "../rabbitmq-registry/rabbitmq-registry.service.js";
import { ON_RABBIT_MESSAGE_METADATA_TOKEN } from "./on-rabbit-message.decorator.js";
import type { RabbitConsumerMessages } from "./rabbitmq.types.js";

type RabbitMessageToken = typeof ON_RABBIT_MESSAGE_METADATA_TOKEN;

export class RabbitMessageInitializer extends Initializer<RabbitMessageToken> {
	readonly token = ON_RABBIT_MESSAGE_METADATA_TOKEN;

	constructor(
		private readonly rabbitMqRegistry: RabbitMqRegistry,
		private readonly rabbitMqAsyncApiOperations: RabbitMqOperationRegistry,
		private readonly consumableMessages: RabbitConsumerMessages,
	) {
		super();
	}

	initialize(context: InitializerContext<RabbitMessageToken>): void {
		const { message, queueName } = context.metadata;
		const operationId = String(context.methodName);
		const isConsumable = this.consumableMessages.some(
			(entry) => entry.type === message.type,
		);

		if (!isConsumable) {
			throw new Error(
				`RabbitMQ message "${operationId}" is not consumable in module "${context.moduleName}"`,
			);
		}
		const binding = { message, queueName };

		this.rabbitMqRegistry.registerConsumerOrThrow(
			binding,
			(payload, messageContext) => context.invoke(payload, messageContext),
		);
		this.rabbitMqAsyncApiOperations.registerConsumer({
			binding,
			moduleName: context.moduleName,
			operationId,
		});
	}
}
