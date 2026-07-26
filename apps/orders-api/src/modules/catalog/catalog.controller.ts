import { GET, schema } from "awilixify/http";

import type { Request } from "../../integrations/http/types.js";
import type { Deps } from "./catalog.module.js";
import { GetProductSchema } from "./get-product.dto.js";

export class CatalogController {
	constructor(private readonly queryMediator: Deps["queryMediator"]) {}

	@GET("/catalog/:sku")
	@schema(GetProductSchema)
	getProduct(request: Request<typeof GetProductSchema>) {
		return this.queryMediator.execute("catalog/get-product", request.params);
	}
}
