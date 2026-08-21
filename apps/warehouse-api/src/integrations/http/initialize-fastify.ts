import type { AppLogger } from "@awilixify-example-platform/logger";
import Fastify, { LogController } from "fastify";

const healthCheckPaths = new Set(["/health/live", "/health/ready"]);

export function initializeFastify(logger: AppLogger) {
	const app = Fastify({
		logController: new LogController({
			disableRequestLogging: (request) =>
				healthCheckPaths.has(request.url.split("?", 1)[0] ?? request.url),
		}),
		loggerInstance: logger,
	});

	app.setSerializerCompiler(() => {
		return (data) => JSON.stringify(data);
	});

	return app;
}
