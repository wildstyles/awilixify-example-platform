import {
	createModule,
	type InferGlobalDependencies,
	type ModuleDef,
} from "awilixify";
import { ConfigModule } from "../config/config.module.js";
import { FastifyService } from "./fastify.service.js";
import { FastifyHttpInitializer } from "./fastify-http.initializer.js";
import { initializeFastify } from "./initialize-fastify.js";
import type { FastifyInstance } from "./types.js";

export type HttpModuleDef = ModuleDef<{
	imports: [typeof ConfigModule];
	providers: {
		app: FastifyInstance;
		fastifyService: FastifyService;
	};
	initializers: {
		http: typeof FastifyHttpInitializer;
	};
	exportKeys: ["app"];
	exportInitializerKeys: ["http"];
}>;

export type Deps = HttpModuleDef["deps"];

export const HttpModule = createModule<HttpModuleDef>({
	name: "HttpModule",
	imports: [ConfigModule],
	providers: {
		app: {
			eager: true,
			useFactory: initializeFastify,
		},
		fastifyService: {
			eager: true,
			initAfter: ["config", "app"],
			useClass: FastifyService,
		},
	},
	exports: ["app"],
	initializers: {
		http: FastifyHttpInitializer,
	},
	initializerExports: ["http"],
});

declare module "awilixify" {
	interface GlobalDependencies extends InferGlobalDependencies<HttpModuleDef> {}
}
