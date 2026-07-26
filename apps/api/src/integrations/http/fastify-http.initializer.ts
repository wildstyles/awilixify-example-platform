import { Initializer, type InitializerContext, isResultLike } from "awilixify";
import {
	HTTP_DECORATOR_STATE_TOKEN,
	rollUpHttpDecoratorState,
} from "awilixify/http";
import type { FastifyReply, FastifyRequest } from "fastify";

import type { Deps } from "./http.module.js";

type HttpToken = typeof HTTP_DECORATOR_STATE_TOKEN;

export class FastifyHttpInitializer extends Initializer<HttpToken> {
	readonly token = HTTP_DECORATOR_STATE_TOKEN;
	private readonly registeredMethods = new Set<string>();

	constructor(private readonly app: Deps["app"]) {
		super();
	}

	initialize(context: InitializerContext<HttpToken>) {
		const methodKey = `${context.target.name}:${String(context.methodName)}`;

		if (this.registeredMethods.has(methodKey)) return;

		this.registeredMethods.add(methodKey);

		const methodState = rollUpHttpDecoratorState(
			context.decoratorState.root,
			context.metadata,
		);

		for (const method of methodState.verbs) {
			for (const url of methodState.paths) {
				this.app.route({
					method,
					url,
					schema: methodState.schema,
					preHandler: methodState.beforeMiddleware,
					handler: async (request: FastifyRequest, reply: FastifyReply) => {
						const result = await context.invoke(request, reply);

						if (reply.sent || result === undefined) return;

						if (isResultLike(result)) {
							if (result.ok) return reply.status(200).send(result.value);

							return reply.status(500).send({
								error: "Application operation failed",
							});
						}

						return result;
					},
				});
			}
		}
	}
}
