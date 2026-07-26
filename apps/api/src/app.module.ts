import { createModule, type ModuleDef } from "awilixify";

import { StatusController } from "./status.controller.js";

class AppService {
	getStatus() {
		return {
			service: "awilixify-example-platform",
			status: "ok",
		} as const;
	}
}

export type AppModuleDef = ModuleDef<{
	providers: {
		appService: AppService;
	};
}>;

export const AppModule = createModule<AppModuleDef>({
	name: "AppModule",
	controllers: [StatusController],
	providers: {
		appService: AppService,
	},
});
