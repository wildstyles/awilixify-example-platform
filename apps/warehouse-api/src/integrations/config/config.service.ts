import { FormatRegistry, type Static, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import dotenv from "dotenv";

function isUrlWithProtocol(
	value: string,
	protocols: readonly string[],
): boolean {
	try {
		const url = new URL(value);
		return protocols.includes(url.protocol) && Boolean(url.hostname);
	} catch {
		return false;
	}
}

FormatRegistry.Set("http-url", (value) =>
	isUrlWithProtocol(value, ["http:", "https:"]),
);
FormatRegistry.Set("amqp-url", (value) =>
	isUrlWithProtocol(value, ["amqp:", "amqps:"]),
);

const DevtoolsTraceHistoryFileSchema = Type.Transform(
	Type.String({
		default: ".awilixify-devtools/traces.json",
		minLength: 1,
	}),
)
	.Decode((value) => (value === "false" ? false : value))
	.Encode((value) => (value === false ? "false" : value));

const RawEnvConfigSchema = Type.Object({
	COMMIT_SHA: Type.String({ default: "unknown", minLength: 1 }),
	DEPLOYMENT_ENVIRONMENT: Type.String({ default: "local", minLength: 1 }),
	DEVTOOLS_HOST: Type.String({ default: "0.0.0.0", minLength: 1 }),
	DEVTOOLS_PORT: Type.Integer({
		default: 3223,
		maximum: 65_535,
		minimum: 1,
	}),
	DEVTOOLS_TRACE_HISTORY_FILE: DevtoolsTraceHistoryFileSchema,
	HTTP_HOST: Type.String({ default: "0.0.0.0", minLength: 1 }),
	HTTP_PORT: Type.Integer({ default: 3001, maximum: 65_535, minimum: 1 }),
	IMAGE_VERSION: Type.String({ default: "development", minLength: 1 }),
	NODE_ENV: Type.Union(
		[
			Type.Literal("development"),
			Type.Literal("test"),
			Type.Literal("production"),
		],
		{ default: "development" },
	),
	PUBLIC_APP_URL: Type.String({
		default: "http://127.0.0.1:3001",
		format: "http-url",
	}),
	RABBITMQ_ADVERTISED_HOST: Type.String({
		default: "localhost:5673",
		minLength: 1,
	}),
	RABBITMQ_URL: Type.String({
		default: "amqp://guest:guest@localhost:5673",
		format: "amqp-url",
	}),
	SERVICE_NAME: Type.String({
		default: "warehouse",
		pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
	}),
	SHUTDOWN_TIMEOUT_MS: Type.Integer({
		default: 10_000,
		maximum: 300_000,
		minimum: 1,
	}),
});

type RawEnvConfig = Static<typeof RawEnvConfigSchema>;

export type AppConfig = {
	commitSha: string;
	deploymentEnvironment: string;
	devtoolsHost: string;
	devtoolsPort: number;
	devtoolsTraceHistoryFile: string | false;
	httpHost: string;
	httpPort: number;
	imageVersion: string;
	nodeEnvironment: RawEnvConfig["NODE_ENV"];
	publicAppUrl: string;
	rabbitMqAdvertisedHost: string;
	rabbitMqUrl: string;
	serviceName: string;
	shutdownTimeoutMs: number;
};

export class ConfigService {
	private config?: AppConfig;

	get(): AppConfig;
	get<TKey extends keyof AppConfig>(key: TKey): AppConfig[TKey];
	get<TKey extends keyof AppConfig>(key?: TKey) {
		if (!this.config) {
			throw new Error("ConfigService was used before initialization");
		}

		return key === undefined ? this.config : this.config[key];
	}

	init(): void {
		dotenv.config({ quiet: true });
		const raw = Value.Convert(
			RawEnvConfigSchema,
			Value.Default(RawEnvConfigSchema, { ...process.env }),
		);

		this.config = this.mapRawEnvToAppConfig(
			Value.Decode(RawEnvConfigSchema, this.validateRawEnvConfig(raw)),
		);
	}

	private validateRawEnvConfig(raw: unknown): RawEnvConfig {
		if (Value.Check(RawEnvConfigSchema, raw)) return raw;

		const errors = [...Value.Errors(RawEnvConfigSchema, raw)]
			.map((error) => `${error.path}: ${error.message}`)
			.join("\n");

		throw new Error(`Invalid environment config:\n${errors}`);
	}

	private mapRawEnvToAppConfig(raw: RawEnvConfig): AppConfig {
		return {
			commitSha: raw.COMMIT_SHA,
			deploymentEnvironment: raw.DEPLOYMENT_ENVIRONMENT,
			devtoolsHost: raw.DEVTOOLS_HOST,
			devtoolsPort: raw.DEVTOOLS_PORT,
			devtoolsTraceHistoryFile: raw.DEVTOOLS_TRACE_HISTORY_FILE,
			httpHost: raw.HTTP_HOST,
			httpPort: raw.HTTP_PORT,
			imageVersion: raw.IMAGE_VERSION,
			nodeEnvironment: raw.NODE_ENV,
			publicAppUrl: raw.PUBLIC_APP_URL,
			rabbitMqAdvertisedHost: raw.RABBITMQ_ADVERTISED_HOST,
			rabbitMqUrl: raw.RABBITMQ_URL,
			serviceName: raw.SERVICE_NAME,
			shutdownTimeoutMs: raw.SHUTDOWN_TIMEOUT_MS,
		};
	}
}
