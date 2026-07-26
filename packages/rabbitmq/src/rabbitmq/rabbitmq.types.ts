import type { Static, TSchema } from "@sinclair/typebox";
import type { ConsumeMessage, Options } from "amqplib";

type RabbitExchange = {
	name: string;
	options?: Options.AssertExchange;
	type?: "direct" | "topic" | "fanout" | "headers";
};

type RabbitMessageDefinition = {
	routingKey?: string;
	serviceName?: string;
	type: string;
};

export type RabbitMessage<TPayload = unknown> = RabbitMessageDefinition & {
	_payloadType?: TPayload;
	exchange: RabbitExchange;
};

export type MessagePayload<TMessage extends RabbitMessage> =
	TMessage extends RabbitMessage<infer TPayload> ? TPayload : never;

export function defineRabbitMessage<TPayload = undefined>(
	message: RabbitMessageDefinition & {
		exchange: RabbitExchange;
		serviceName: string;
	},
): RabbitMessage<TPayload> & { serviceName: string };

export function defineRabbitMessage<TPayload = undefined>(
	message: RabbitMessageDefinition & { exchange: RabbitExchange },
): RabbitMessage<TPayload>;

export function defineRabbitMessage(
	message: RabbitMessageDefinition & { exchange: RabbitExchange },
) {
	return message;
}

export function defineRabbitExchange(exchange: RabbitExchange) {
	function defineMessage<TPayload = undefined>(
		message: RabbitMessageDefinition,
	): RabbitMessage<TPayload>;

	function defineMessage<const TPayloadSchema extends TSchema>(
		message: RabbitMessageDefinition & { payload: TPayloadSchema },
	): RabbitMessage<Static<TPayloadSchema>> & { payload: TPayloadSchema };

	function defineMessage(
		message: RabbitMessageDefinition & { payload?: TSchema },
	) {
		return { ...message, exchange };
	}

	return { defineMessage };
}

export type RabbitConsumerBinding = {
	message: RabbitMessage;
	queueName: string;
};

// Delivery metadata handed to a consumer alongside the decoded payload. Curated
// so controllers don't couple to amqplib directly; `raw` is an escape hatch for
// the full amqplib message when needed.
export type RabbitMessageContext = {
	type: string;
	routingKey: string;
	queueName: string;
	redelivered: boolean;
	headers: Record<string, unknown>;
	raw: ConsumeMessage;
};

export type RabbitConsumerMessages = readonly RabbitMessage[];

export type RabbitPublisherMessages = Record<string, RabbitMessage>;
