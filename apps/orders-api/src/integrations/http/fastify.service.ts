import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

import type { Deps } from "./http.module.js";

export class FastifyService {
	constructor(
		private readonly app: Deps["app"],
		private readonly config: Deps["config"],
	) {}

	async init() {
		await this.app.register(fastifySwagger, {
			openapi: {
				info: {
					title: "Orders API",
					version: "1.0.0",
				},
				servers: [
					{
						description: `${this.config.get("deploymentEnvironment")} server`,
						url: this.config.get("publicAppUrl"),
					},
				],
			},
		});

		await this.app.register(fastifySwaggerUi, {
			routePrefix: "/api-docs",
		});
	}

	async postInit() {
		await this.app.listen({
			host: this.config.get("httpHost"),
			port: this.config.get("httpPort"),
		});
	}

	async dispose() {
		await this.app.close();
	}
}
