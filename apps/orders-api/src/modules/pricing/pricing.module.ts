import { createModule, type ModuleDef } from "awilixify";

import { CatalogModule } from "../catalog/catalog.module.js";
import { PricingService } from "./pricing.service.js";

export type PricingModuleDef = ModuleDef<{
	imports: [typeof CatalogModule];
	providers: {
		pricingService: PricingService;
	};
	exportKeys: ["pricingService"];
}>;

export type Deps = PricingModuleDef["deps"];

export const PricingModule = createModule<PricingModuleDef>({
	name: "PricingModule",
	imports: [CatalogModule],
	providers: {
		pricingService: PricingService,
	},
	exports: ["pricingService"],
});
