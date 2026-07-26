import { defineConfig } from "orval";

const warehouseOpenApiUrl =
	process.env.WAREHOUSE_OPENAPI_URL ?? "http://127.0.0.1:3001/api-docs/json";

export default defineConfig({
	warehouse: {
		input: {
			target: warehouseOpenApiUrl,
			filters: {
				tags: ["reservations"],
			},
		},
		output: {
			target: "./generated/warehouse.ts",
			client: "fetch",
			baseUrl: {
				runtime: '(process.env.WAREHOUSE_API_URL ?? "http://127.0.0.1:3001")',
			},
			override: {
				fetch: {
					includeHttpResponseReturnType: false,
				},
			},
			formatter: "biome",
		},
	},
});
