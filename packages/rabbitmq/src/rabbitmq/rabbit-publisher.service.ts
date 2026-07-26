import type { RabbitMqOperationRegistry } from "../asyncapi-registry/rabbitmq-operation.registry.js";
import type {
	RabbitMqRegistry,
	RabbitRegistryPublishInput,
} from "../rabbitmq-registry/rabbitmq-registry.service.js";
import type {
	MessagePayload,
	RabbitMessage,
	RabbitPublisherMessages,
} from "./rabbitmq.types.js";

type RabbitPublishInput<TMessage extends RabbitMessage> =
	RabbitRegistryPublishInput<TMessage> &
		([MessagePayload<TMessage>] extends [undefined]
			? { payload?: undefined }
			: { payload: MessagePayload<TMessage> });

export class RabbitPublisher<
	TPublishable extends RabbitPublisherMessages = RabbitPublisherMessages,
> {
	readonly messages: TPublishable;
	private readonly allowedMessages: ReadonlySet<RabbitMessage>;

	constructor(
		private readonly rabbitMqRegistry: RabbitMqRegistry,
		rabbitMqAsyncApiOperations: RabbitMqOperationRegistry,
		publishableMessages: TPublishable,
	) {
		this.messages = publishableMessages;
		this.allowedMessages = new Set(Object.values(publishableMessages));

		for (const [operationId, message] of Object.entries(publishableMessages)) {
			rabbitMqAsyncApiOperations.registerPublisher({
				message,
				operationId,
			});
		}
	}

	publish<TMessage extends TPublishable[keyof TPublishable]>(
		input: RabbitPublishInput<TMessage>,
	): Promise<void> {
		if (!this.allowedMessages.has(input.message)) {
			throw new Error(
				`RabbitMQ message "${input.message.type}" is not publishable in this module scope`,
			);
		}

		return this.rabbitMqRegistry.publish(input);
	}
}
