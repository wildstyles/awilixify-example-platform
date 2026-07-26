import { defineCodegenConfig } from "@awilixify/cli/codegen";

const warehouseAsyncApiUrl =
	process.env.WAREHOUSE_ASYNCAPI_URL ?? "http://127.0.0.1:3001/asyncapi.json";

export default defineCodegenConfig({
	asyncApiClients: [
		{
			asyncApi: warehouseAsyncApiUrl,
			include: ["reserveInventory"],
			outputDirectory: "./generated",
			runtimeImport: "@awilixify-example-platform/rabbitmq",
			serviceName: "warehouse",
			clientClassName: "WarehouseMessagingClient",
			messagesConstName: "WarehouseMessages",
			clientFileName: "warehouse-messaging.client.ts",
			messagesFileName: "warehouse.messages.ts",
			module: {
				outputPath: "./warehouse-messaging.module.ts",
				moduleName: "WarehouseMessagingModule",
				clientProviderName: "warehouseMessagingClient",
				clientImport: "./generated/warehouse-messaging.client.js",
				messagesImport: "./generated/warehouse.messages.js",
			},
		},
	],
});
