import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { Static, TSchema } from "@sinclair/typebox";
import type { RouteSchema } from "awilixify/http";
import type {
	FastifyInstance as DefaultFastifyInstance,
	FastifyBaseLogger,
	FastifyRequest,
	RawReplyDefaultExpression,
	RawRequestDefaultExpression,
	RawServerDefault,
} from "fastify";

export type FastifyInstance = DefaultFastifyInstance<
	RawServerDefault,
	RawRequestDefaultExpression<RawServerDefault>,
	RawReplyDefaultExpression<RawServerDefault>,
	FastifyBaseLogger,
	TypeBoxTypeProvider
>;

export type Request<S extends RouteSchema> = FastifyRequest<{
	Querystring: S["querystring"] extends TSchema
		? Static<S["querystring"]>
		: unknown;
	Params: S["params"] extends TSchema ? Static<S["params"]> : unknown;
	Body: S["body"] extends TSchema ? Static<S["body"]> : unknown;
}>;
