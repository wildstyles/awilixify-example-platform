import { startOpenTelemetry } from "./index.js";

const telemetry = startOpenTelemetry();
let shutdown: Promise<void> | undefined;

const shutdownTelemetry = () => {
	if (!telemetry || shutdown) return;

	shutdown = telemetry.shutdown().catch((error: unknown) => {
		console.error("OpenTelemetry shutdown failed", error);
		process.exitCode = 1;
	});
};

if (telemetry) {
	process.once("SIGINT", shutdownTelemetry);
	process.once("SIGTERM", shutdownTelemetry);
}
