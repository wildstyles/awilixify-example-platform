import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import type { FastifyInstance } from "./types.js";

export function initializeFastify(): FastifyInstance {
	const app = Fastify({
		logger: true,
	}).withTypeProvider<TypeBoxTypeProvider>();

	app.setSerializerCompiler(() => {
		return (data) => JSON.stringify(data);
	});

	return app;
}
