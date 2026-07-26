import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

import type { Deps } from "./http.module.js";

export class FastifyService {
	constructor(private readonly app: Deps["app"]) {}

	async init() {
		await this.app.register(fastifySwagger, {
			openapi: {
				info: {
					title: "Warehouse API",
					version: "1.0.0",
				},
				servers: [
					{
						description: "Development server",
						url: "http://localhost:3001",
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
			host: "0.0.0.0",
			port: 3001,
		});
	}

	async dispose() {
		await this.app.close();
	}
}
