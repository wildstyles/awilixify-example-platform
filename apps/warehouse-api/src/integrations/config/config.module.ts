import { createModule, type ModuleDef } from "awilixify";

import { ConfigService } from "./config.service.js";

type ConfigModuleDef = ModuleDef<{
	providers: {
		config: ConfigService;
	};
	exportKeys: ["config"];
}>;

export const ConfigModule = createModule<ConfigModuleDef>({
	name: "ConfigModule",
	providers: {
		config: {
			eager: true,
			useClass: ConfigService,
		},
	},
	exports: ["config"],
});
