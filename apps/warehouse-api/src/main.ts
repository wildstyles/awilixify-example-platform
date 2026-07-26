import { DevtoolsModule } from "@awilixify/devtools";
import { DIContext } from "awilixify";

import { AppModule } from "./app.module.js";
import { HttpModule } from "./integrations/http/http.module.js";

const app = DIContext.create(AppModule, {
	globalModules: [
		DevtoolsModule({
			appUrl: "http://127.0.0.1:3001",
			host: "0.0.0.0",
			port: 3223,
			serviceName: "warehouse",
		}),
		HttpModule,
	],
});

await app.init();

async function shutdown(): Promise<void> {
	await app.dispose();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
