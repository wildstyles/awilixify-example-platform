import { GET } from "awilixify/http";

import type { Reply } from "../http/types.js";
import type { Deps } from "./health.module.js";

export class HealthController {
	private wasReady: boolean | undefined;

	constructor(
		private readonly config: Deps["config"],
		private readonly rabbitMqRegistry: Deps["rabbitMqRegistry"],
		private readonly logger: Deps["logger"],
	) {}

	@GET("/health/live")
	liveness() {
		return { status: "alive" };
	}

	@GET("/health/ready")
	readiness(_request: unknown, reply: Reply) {
		if (this.rabbitMqRegistry.isConnected()) {
			if (this.wasReady === false) {
				this.logger.info("Service readiness recovered");
			}
			this.wasReady = true;

			return {
				dependencies: { rabbitmq: "ready" },
				status: "ready" as const,
			};
		}

		if (this.wasReady !== false) {
			this.logger.warn({ dependency: "rabbitmq" }, "Service is not ready");
		}
		this.wasReady = false;

		return reply.status(503).send({
			dependencies: { rabbitmq: "not-ready" },
			error: "Service dependencies are not ready",
			status: "not-ready",
		});
	}

	@GET("/health/release")
	release() {
		return {
			commitSha: this.config.get("commitSha"),
			environment: this.config.get("deploymentEnvironment"),
			imageVersion: this.config.get("imageVersion"),
			serviceName: this.config.get("serviceName"),
		};
	}
}
