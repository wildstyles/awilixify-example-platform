import { Parser as AsyncApiParser, DiagnosticSeverity } from "@asyncapi/parser";
import type { RabbitMessage } from "../rabbitmq/rabbitmq.types.js";
import type { Deps } from "./asyncapi-docs.module.js";

export type AsyncApiDocumentOptions = {
	description?: string;
	server?: {
		description?: string;
		host: string;
	};
	title: string;
	version: string;
};

export type AsyncApiDocument = {
	asyncapi: "3.1.0";
	channels: Record<string, unknown>;
	defaultContentType: "application/json";
	info: {
		description?: string;
		title: string;
		version: string;
	};
	operations: Record<string, unknown>;
	servers?: Record<string, unknown>;
};

export class RabbitMqAsyncApiDocumentService {
	private readonly documentCache = new Map<string, Promise<AsyncApiDocument>>();
	private readonly parser = new AsyncApiParser();
	private operationRegistryVersion = -1;

	constructor(
		private readonly rabbitMqAsyncApiOperations: Deps["rabbitMqAsyncApiOperations"],
	) {}

	createDocument(options: AsyncApiDocumentOptions): Promise<AsyncApiDocument> {
		const operationRegistryVersion =
			this.rabbitMqAsyncApiOperations.getVersion();
		if (operationRegistryVersion !== this.operationRegistryVersion) {
			this.documentCache.clear();
			this.operationRegistryVersion = operationRegistryVersion;
		}

		const cacheKey = JSON.stringify(options);
		const cachedDocument = this.documentCache.get(cacheKey);
		if (cachedDocument) return cachedDocument;

		const document = this.buildAndValidateDocument(options);
		this.documentCache.set(cacheKey, document);

		return document;
	}

	private async buildAndValidateDocument(
		options: AsyncApiDocumentOptions,
	): Promise<AsyncApiDocument> {
		const channels: Record<string, unknown> = {};
		const operations: Record<string, unknown> = {};

		for (const operation of this.rabbitMqAsyncApiOperations.getConsumers()) {
			const channelId = operation.operationId;
			const message = operation.binding.message;
			channels[channelId] ??= this.createChannel(
				message,
				operation.operationId,
			);

			const operationId = operation.operationId;
			this.assertUniqueOperationId(operations, operationId);
			operations[operationId] = {
				action: "receive",
				bindings: {
					amqp: {
						ack: true,
						bindingVersion: "0.3.0",
					},
				},
				channel: {
					$ref: `#/channels/${channelId}`,
				},
				messages: [
					{
						$ref: `#/channels/${channelId}/messages/${operation.operationId}`,
					},
				],
				"x-awilixify-module": operation.moduleName,
				"x-awilixify-queue": operation.binding.queueName,
			};
		}

		for (const operation of this.rabbitMqAsyncApiOperations.getPublishers()) {
			const channelId = operation.operationId;
			channels[channelId] ??= this.createChannel(
				operation.message,
				operation.operationId,
			);

			const operationId = operation.operationId;
			this.assertUniqueOperationId(operations, operationId);
			operations[operationId] = {
				action: "send",
				channel: { $ref: `#/channels/${channelId}` },
				messages: [
					{
						$ref: `#/channels/${channelId}/messages/${operation.operationId}`,
					},
				],
			};
		}

		const document: AsyncApiDocument = {
			asyncapi: "3.1.0",
			channels,
			defaultContentType: "application/json",
			info: {
				description: options.description,
				title: options.title,
				version: options.version,
			},
			operations,
			servers: options.server
				? {
						rabbitmq: {
							description: options.server.description,
							host: options.server.host,
							protocol: "amqp",
						},
					}
				: undefined,
		};

		const diagnostics = await this.parser.validate(document);
		const errors = diagnostics.filter(
			(diagnostic) => diagnostic.severity === DiagnosticSeverity.Error,
		);
		if (errors.length) {
			throw new Error(
				`Generated AsyncAPI document is invalid:\n${errors
					.map((error) => `- ${error.message}`)
					.join("\n")}`,
			);
		}

		return document;
	}

	private createChannel(
		message: RabbitMessage,
		operationId: string,
	): Record<string, unknown> {
		const { exchange } = message;

		return {
			address: message.routingKey ?? "",
			bindings: {
				amqp: {
					bindingVersion: "0.3.0",
					exchange: {
						autoDelete: exchange.options?.autoDelete ?? false,
						durable: exchange.options?.durable ?? true,
						name: exchange.name,
						type: exchange.type ?? "topic",
						vhost: "/",
					},
					is: "routingKey",
				},
			},
			messages: {
				[operationId]: {
					contentType: "application/json",
					name: message.type,
					"x-awilixify-type": message.type,
					...("payload" in message ? { payload: message.payload } : {}),
				},
			},
		};
	}

	private assertUniqueOperationId(
		operations: Record<string, unknown>,
		operationId: string,
	): void {
		if (operationId in operations) {
			throw new Error(`Duplicate AsyncAPI operation ID: ${operationId}`);
		}
	}
}
