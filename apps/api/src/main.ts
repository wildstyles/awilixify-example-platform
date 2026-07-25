import { DIContext } from "awilixify";
import { DevtoolsModule } from "awilixify-devtools";

import { AppModule } from "./app.module.js";

const app = DIContext.create(AppModule, {
	globalModules: [
		DevtoolsModule({
			host: "0.0.0.0",
			traceHistoryFile: false,
		}),
	],
});

await app.init();

async function shutdown(): Promise<void> {
	await app.dispose();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
