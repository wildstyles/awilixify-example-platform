import { GET, schema } from "awilixify/http";

import type { Request } from "../../integrations/http/types.js";
import { GetStockSchema } from "./get-stock.dto.js";
import type { Deps } from "./inventory.module.js";

export class InventoryController {
	constructor(private readonly queryMediator: Deps["queryMediator"]) {}

	@GET("/inventory/:sku")
	@schema(GetStockSchema)
	getStock(request: Request<typeof GetStockSchema>) {
		return this.queryMediator.execute("inventory/get-stock", request.params);
	}
}
