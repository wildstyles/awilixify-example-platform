import { defineCodegenConfig } from "@awilixify/cli/codegen";

const warehouseAsyncApiUrl =
	process.env.WAREHOUSE_ASYNCAPI_URL ?? "http://127.0.0.1:3001/asyncapi.json";

export default defineCodegenConfig({
	asyncApiConsumers: [
		{
			asyncApi: warehouseAsyncApiUrl,
			include: ["reservationCreated"],
			messagesConstName: "WarehouseEvents",
			outputDirectory: "./generated",
			runtimeImport: "@awilixify-example-platform/rabbitmq",
			serviceName: "warehouse",
			messagesFileName: "warehouse.events.ts",
			module: {
				messagesImport: "./generated/warehouse.events.js",
				moduleName: "WarehouseEventsModule",
				outputPath: "./warehouse-events.module.ts",
			},
		},
	],
});
