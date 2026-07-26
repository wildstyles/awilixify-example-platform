export { RabbitMqAsyncApiDocsModule } from "./asyncapi-docs/asyncapi-docs.module.js";
export {
	ON_RABBIT_MESSAGE_METADATA_TOKEN,
	onRabbitMessage,
} from "./rabbitmq/on-rabbit-message.decorator.js";
export { RabbitPublisher } from "./rabbitmq/rabbit-publisher.service.js";
export { RabbitMqModule } from "./rabbitmq/rabbitmq.module.js";
export {
	defineRabbitExchange,
	defineRabbitMessage,
	type MessagePayload,
	type RabbitMessageContext,
} from "./rabbitmq/rabbitmq.types.js";
