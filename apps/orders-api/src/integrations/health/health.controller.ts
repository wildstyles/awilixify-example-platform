import { GET } from "awilixify/http";

import type { Reply } from "../http/types.js";
import type { Deps } from "./health.module.js";

export class HealthController {
	constructor(
		private readonly config: Deps["config"],
		private readonly rabbitMqRegistry: Deps["rabbitMqRegistry"],
	) {}

	@GET("/health/live")
	liveness() {
		return { status: "alive" };
	}

	@GET("/health/ready")
	readiness(_request: unknown, reply: Reply) {
		if (this.rabbitMqRegistry.isConnected()) {
			return {
				dependencies: { rabbitmq: "ready" },
				status: "ready",
			};
		}

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
