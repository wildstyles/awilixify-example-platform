import { createModule, type ModuleDef } from "awilixify";

import { CatalogController } from "./catalog.controller.js";
import { CatalogService } from "./catalog.service.js";
import { GetProductQueryHandler } from "./get-product.query.js";

export type CatalogModuleDef = ModuleDef<{
	providers: {
		catalogService: CatalogService;
	};
	exportKeys: ["catalogService"];
	queryHandlers: [GetProductQueryHandler];
}>;

export type Deps = CatalogModuleDef["deps"];

export const CatalogModule = createModule<CatalogModuleDef>({
	name: "CatalogModule",
	controllers: [CatalogController],
	providers: {
		catalogService: CatalogService,
	},
	exports: ["catalogService"],
	queryHandlers: [GetProductQueryHandler],
});
