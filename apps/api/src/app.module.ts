import { createModule, type ModuleDef } from "awilixify";

class AppService {
	getStatus(): string {
		return "ok";
	}
}

export type AppModuleDef = ModuleDef<{
	providers: {
		appService: AppService;
	};
}>;

export const AppModule = createModule<AppModuleDef>({
	name: "AppModule",
	providers: {
		appService: AppService,
	},
});
