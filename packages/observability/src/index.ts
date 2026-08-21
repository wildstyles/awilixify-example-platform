import { FastifyOtelInstrumentation } from "@fastify/otel";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { AmqplibInstrumentation } from "@opentelemetry/instrumentation-amqplib";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { NodeSDK } from "@opentelemetry/sdk-node";

const ignoredIncomingPaths = new Set(["/health/live", "/health/ready"]);

export function startOpenTelemetry(): NodeSDK | undefined {
	const tracesEndpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;

	// Local development and Minikube do not install the tracing backend. Leaving
	// the endpoint unset disables exporting without changing application code.
	if (!tracesEndpoint || process.env.OTEL_SDK_DISABLED === "true") return;

	const sdk = new NodeSDK({
		traceExporter: new OTLPTraceExporter({ url: tracesEndpoint }),
		instrumentations: [
			new HttpInstrumentation({
				ignoreIncomingRequestHook: (request) =>
					ignoredIncomingPaths.has(request.url ?? ""),
			}),
			new FastifyOtelInstrumentation({
				ignorePaths: (request) => ignoredIncomingPaths.has(request.url),
				instrumentHooks: false,
				registerOnInitialization: true,
			}),
			// Node's built-in fetch uses Undici rather than the http module.
			new UndiciInstrumentation(),
			// amqp-connection-manager delegates to amqplib, whose publish, consume,
			// trace-context propagation, acknowledgement, and errors are traced.
			new AmqplibInstrumentation({ consumeTimeoutMs: 60_000 }),
		],
	});

	sdk.start();
	return sdk;
}
