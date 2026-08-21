import { context, trace } from "@opentelemetry/api";
import {
	createModule,
	type InferGlobalDependencies,
	type ModuleDef,
} from "awilixify";
import pino, { type Logger } from "pino";

export type AppLogger = Logger;

export type CreateLoggerOptions = {
	serviceName: string;
};

export function createLogger(options: CreateLoggerOptions): AppLogger {
	const isDevelopment =
		(process.env.NODE_ENV ?? "development") === "development";

	return pino({
		base: {
			service: options.serviceName,
		},
		formatters: {
			level: (label) => ({ level: label }),
		},
		level: process.env.LOG_LEVEL ?? "info",
		mixin() {
			const spanContext = trace.getSpan(context.active())?.spanContext();
			if (!spanContext) return {};

			return {
				span_id: spanContext.spanId,
				trace_id: spanContext.traceId,
			};
		},
		redact: {
			censor: "[Redacted]",
			paths: [
				"password",
				"*.password",
				"req.headers.authorization",
				"req.headers.cookie",
			],
		},
		transport: isDevelopment
			? {
					options: {
						colorize: true,
						singleLine: true,
						translateTime: "SYS:standard",
					},
					target: "pino-pretty",
				}
			: undefined,
	});
}

type LoggerModuleDef = ModuleDef<{
	providers: {
		logger: AppLogger;
	};
	exportKeys: ["logger"];
}>;

export function LoggerModule(options: { logger: AppLogger }) {
	return createModule<LoggerModuleDef>({
		name: "LoggerModule",
		providers: {
			logger: {
				eager: true,
				useFactory: () => options.logger,
			},
		},
		exports: ["logger"],
	});
}

declare module "awilixify" {
	interface GlobalDependencies
		extends InferGlobalDependencies<LoggerModuleDef> {}
}
