import { DevtoolsModule } from "@awilixify/devtools";
import { createLogger, LoggerModule } from "@awilixify-example-platform/logger";
import { DIContext } from "awilixify";

import { AppModule } from "./app.module.js";
import { HttpModule } from "./integrations/http/http.module.js";

const shutdownTimeoutMs = Number.parseInt(
	process.env.SHUTDOWN_TIMEOUT_MS ?? "10000",
	10,
);
const traceOptions = {
	traceExcludePaths: ["/health/live", "/health/ready"],
};
const logger = createLogger({ serviceName: "warehouse" });

const app = DIContext.create(AppModule, {
	globalModules: [
		LoggerModule({ logger }),
		DevtoolsModule({
			...traceOptions,
			appUrl: process.env.PUBLIC_APP_URL ?? "http://127.0.0.1:3001",
			host: process.env.DEVTOOLS_HOST ?? "0.0.0.0",
			port: Number.parseInt(process.env.DEVTOOLS_PORT ?? "3223", 10),
			// Git-based impact analysis needs a development source checkout.
			providerImpact: (process.env.NODE_ENV ?? "development") === "development",
			serviceName: process.env.SERVICE_NAME ?? "warehouse",
			traceHistoryFile:
				process.env.DEVTOOLS_TRACE_HISTORY_FILE === "false"
					? false
					: (process.env.DEVTOOLS_TRACE_HISTORY_FILE ??
						".awilixify-devtools/traces.json"),
		}),
		HttpModule,
	],
});

await app.init();

let shutdown: Promise<void> | undefined;
const handleSignal = (signal: NodeJS.Signals) => {
	if (shutdown) return;

	logger.info({ signal }, "Shutting down");
	const timer = setTimeout(() => {
		logger.error({ timeout_ms: shutdownTimeoutMs }, "Shutdown timed out");
		process.exit(1);
	}, shutdownTimeoutMs);

	shutdown = app.dispose().finally(() => clearTimeout(timer));
	void shutdown.catch((error: unknown) => {
		logger.error({ err: error }, "Graceful shutdown failed");
		process.exitCode = 1;
	});
};

process.once("SIGINT", handleSignal);
process.once("SIGTERM", handleSignal);
