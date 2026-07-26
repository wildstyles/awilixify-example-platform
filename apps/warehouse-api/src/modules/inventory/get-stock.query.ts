import type { Handler, QueryContract } from "awilixify";

import type {
	GetStockParams as Payload,
	GetStockResponse as Response,
} from "./get-stock.dto.js";
import type { Deps } from "./inventory.module.js";

export class GetStockQueryHandler
	implements Handler<GetStockQueryHandler["contract"]>
{
	static readonly key = "inventory/get-stock";
	declare readonly contract: QueryContract<
		typeof GetStockQueryHandler.key,
		Payload,
		Response
	>;

	constructor(private readonly inventoryService: Deps["inventoryService"]) {}

	async executor(payload: Payload): Promise<Response> {
		return this.inventoryService.getStock(payload.sku);
	}
}
