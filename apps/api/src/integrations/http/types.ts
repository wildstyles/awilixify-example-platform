import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type {
	FastifyInstance as DefaultFastifyInstance,
	FastifyBaseLogger,
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
