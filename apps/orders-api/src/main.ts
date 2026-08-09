import { DevtoolsModule } from "@awilixify/devtools";
import { DIContext } from "awilixify";

import { AppModule } from "./app.module.js";
import { HttpModule } from "./integrations/http/http.module.js";

const shutdownTimeoutMs = Number.parseInt(
	process.env.SHUTDOWN_TIMEOUT_MS ?? "10000",
	10,
);

const app = DIContext.create(AppModule, {
	globalModules: [
		DevtoolsModule({
			appUrl: process.env.PUBLIC_APP_URL ?? "http://127.0.0.1:3000",
			host: process.env.DEVTOOLS_HOST ?? "0.0.0.0",
			port: Number.parseInt(process.env.DEVTOOLS_PORT ?? "3221", 10),
			serviceName: process.env.SERVICE_NAME ?? "orders",
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

	console.info(`Received ${signal}; shutting down`);
	const timer = setTimeout(() => {
		console.error(`Shutdown exceeded ${shutdownTimeoutMs}ms`);
		process.exit(1);
	}, shutdownTimeoutMs);

	shutdown = app.dispose().finally(() => clearTimeout(timer));
	void shutdown.catch((error: unknown) => {
		console.error("Graceful shutdown failed", error);
		process.exitCode = 1;
	});
};

process.once("SIGINT", handleSignal);
process.once("SIGTERM", handleSignal);
