import type {
	RabbitConsumerBinding,
	RabbitMessage,
} from "../rabbitmq/rabbitmq.types.js";

export type RabbitConsumerRegistration = {
	binding: RabbitConsumerBinding;
	moduleName: string;
	operationId: string;
};

export type RabbitPublisherRegistration = {
	message: RabbitMessage;
	operationId: string;
};

export class RabbitMqOperationRegistry {
	private readonly consumers = new Map<string, RabbitConsumerRegistration>();
	private readonly publishers = new Map<string, RabbitPublisherRegistration>();
	private version = 0;

	registerConsumer(operation: RabbitConsumerRegistration): void {
		this.consumers.set(operation.binding.queueName, operation);
		this.version += 1;
	}

	getConsumers(): readonly RabbitConsumerRegistration[] {
		return [...this.consumers.values()];
	}

	registerPublisher(operation: RabbitPublisherRegistration): void {
		const key = `${operation.message.type}:${operation.operationId}`;
		this.publishers.set(key, operation);
		this.version += 1;
	}

	getPublishers(): readonly RabbitPublisherRegistration[] {
		return [...this.publishers.values()];
	}

	getVersion(): number {
		return this.version;
	}
}
