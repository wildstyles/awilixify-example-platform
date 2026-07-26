import { createModule, type ModuleDef } from "awilixify";

import { CustomersService } from "./customers.service.js";

export type CustomersModuleDef = ModuleDef<{
	providers: {
		customersService: CustomersService;
	};
	exportKeys: ["customersService"];
}>;

export type Deps = CustomersModuleDef["deps"];

export const CustomersModule = createModule<CustomersModuleDef>({
	name: "CustomersModule",
	providers: {
		customersService: CustomersService,
	},
	exports: ["customersService"],
});
