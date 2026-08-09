import amqp, {
	type AmqpConnectionManager,
	type Channel,
	type ChannelWrapper,
} from "amqp-connection-manager";
import type { ConsumeMessage, Options } from "amqplib";
import {
	getTracePropagationHeaders,
	runWithTraceparent,
	TRACEPARENT_HEADER,
} from "awilixify/devtools";

import type {
	MessagePayload,
	RabbitConsumerBinding,
	RabbitMessage,
	RabbitMessageContext,
} from "../rabbitmq/rabbitmq.types.js";

export type RabbitRegistryPublishInput<TMessage extends RabbitMessage> = {
	message: TMessage;
	options?: Options.Publish;
	payload?: MessagePayload<TMessage>;
};

export class RabbitMqRegistry {
	private readonly channel: ChannelWrapper;
	private readonly connection: AmqpConnectionManager;
	private readonly registeredQueues = new Set<string>();

	constructor() {
		const url = process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5673";

		this.connection = amqp.connect([url]);
		this.channel = this.connection.createChannel({
			name: "awilixify-example-platform",
		});
	}

	isConnected(): boolean {
		return this.connection.isConnected();
	}

	async publish<TMessage extends RabbitMessage>(
		input: RabbitRegistryPublishInput<TMessage>,
	): Promise<void> {
		const { message, payload, options = {} } = input;
		const { exchange } = message;

		await this.channel.assertExchange(
			exchange.name,
			exchange.type ?? "topic",
			exchange.options,
		);
		await this.channel.publish(
			exchange.name,
			message.routingKey ?? "",
			Buffer.from(payload === undefined ? "" : JSON.stringify(payload)),
			{
				contentType: "application/json",
				persistent: true,
				...options,
				headers: {
					...options.headers,
					...getTracePropagationHeaders(),
				},
				type: message.type,
			},
		);
	}

	registerConsumerOrThrow(
		binding: RabbitConsumerBinding,
		handler: (
			payload: unknown,
			context: RabbitMessageContext,
		) => Promise<unknown> | unknown,
	): void {
		const { exchange } = binding.message;

		if (this.registeredQueues.has(binding.queueName)) {
			throw new Error(
				`RabbitMQ consumer for queue "${binding.queueName}" is already registered`,
			);
		}

		this.registeredQueues.add(binding.queueName);

		void this.channel.addSetup(async (channel: Channel) => {
			await channel.assertExchange(
				exchange.name,
				exchange.type ?? "topic",
				exchange.options,
			);
			await channel.assertQueue(binding.queueName, { durable: true });
			await channel.bindQueue(
				binding.queueName,
				exchange.name,
				binding.message.routingKey ?? "",
			);
			await channel.consume(
				binding.queueName,
				async (rabbitMessage: ConsumeMessage | null) => {
					if (!rabbitMessage) return;

					try {
						const content = rabbitMessage.content.toString("utf8");
						const payload = content ? JSON.parse(content) : undefined;
						const messageContext: RabbitMessageContext = {
							type: binding.message.type,
							routingKey: rabbitMessage.fields.routingKey,
							queueName: binding.queueName,
							redelivered: rabbitMessage.fields.redelivered,
							headers: (rabbitMessage.properties.headers ?? {}) as Record<
								string,
								unknown
							>,
							raw: rabbitMessage,
						};
						await runWithTraceparent(getRabbitTraceparent(rabbitMessage), () =>
							handler(payload, messageContext),
						);
						channel.ack(rabbitMessage);
					} catch (error) {
						channel.nack(rabbitMessage, false, false);
						console.error(
							`RabbitMQ message "${binding.message.type}" failed`,
							error,
						);
					}
				},
			);
		});
	}

	async close(): Promise<void> {
		await this.channel.close();
		await this.connection.close();
	}
}

function getRabbitTraceparent(
	message: ConsumeMessage,
): string | string[] | undefined {
	const value = message.properties.headers?.[TRACEPARENT_HEADER];

	if (typeof value === "string") return value;
	if (Array.isArray(value)) {
		return value.filter((item): item is string => typeof item === "string");
	}

	return undefined;
}
