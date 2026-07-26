import {
	createModule,
	type InferGlobalDependencies,
	type ModuleDef,
} from "awilixify";
import { FastifyService } from "./fastify.service.js";
import { FastifyHttpInitializer } from "./fastify-http.initializer.js";
import { initializeFastify } from "./initialize-fastify.js";
import type { FastifyInstance } from "./types.js";

export type HttpModuleDef = ModuleDef<{
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
	providers: {
		app: {
			eager: true,
			useFactory: initializeFastify,
		},
		fastifyService: {
			eager: true,
			initAfter: ["app"],
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
