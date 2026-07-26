import { createDecoratorStateUpdater } from "awilixify";

import type {
	MessagePayload,
	RabbitConsumerBinding,
	RabbitMessage,
	RabbitMessageContext,
} from "./rabbitmq.types.js";

const updater = createDecoratorStateUpdater("RabbitMQ listeners", {
	method: (): RabbitConsumerBinding => undefined as never,
});

export const ON_RABBIT_MESSAGE_METADATA_TOKEN = updater.token;

// Generic over the message contract so the decorated handler is constrained to
// accept exactly that contract's payload — annotating the wrong payload shape is
// a compile error. The handler may take just the payload, or additionally the
// delivery context as a second parameter; the argument tuple is constrained so
// both arities stay valid while the payload and context types are enforced.
export function onRabbitMessage<TMessage extends RabbitMessage>(
	message: TMessage,
	options: Pick<RabbitConsumerBinding, "queueName">,
) {
	return <
		This,
		Args extends [
			payload: MessagePayload<TMessage>,
			context?: RabbitMessageContext,
		],
		Result,
	>(
		target: (this: This, ...args: Args) => Result,
		context: ClassMethodDecoratorContext<
			This,
			(this: This, ...args: Args) => Result
		>,
	) => {
		updater.update(context, {
			method: () => ({
				message,
				queueName: options.queueName,
			}),
		});

		return target;
	};
}
