import { defineCodegenConfig } from "@awilixify/cli/codegen";

const warehouseOpenApiUrl =
	process.env.WAREHOUSE_OPENAPI_URL ?? "http://127.0.0.1:3001/api-docs/json";

export default defineCodegenConfig({
	clients: [
		{
			serviceName: "warehouse",
			openApi: warehouseOpenApiUrl,
			tags: ["reservations"],
			outputDirectory: "./generated",
			generatedClientImport: "./warehouse.js",
			apiClientClassName: "WarehouseApiClient",
			operationsConstName: "WarehouseOperations",
			apiClientFileName: "warehouse-api-client.ts",
			operationsFileName: "warehouse.operations.ts",
			module: {
				outputPath: "./warehouse-gateway.module.ts",
				moduleName: "WarehouseGatewayModule",
				apiClientProviderName: "warehouseApiClient",
				apiClientImport: "./generated/warehouse-api-client.js",
			},
		},
	],
});
