import type { Handler, QueryContract } from "awilixify";

import type { Deps } from "./catalog.module.js";
import type {
	GetProductParams as Payload,
	GetProductResponse as Response,
} from "./get-product.dto.js";

export class GetProductQueryHandler
	implements Handler<GetProductQueryHandler["contract"]>
{
	static readonly key = "catalog/get-product";
	declare readonly contract: QueryContract<
		typeof GetProductQueryHandler.key,
		Payload,
		Response
	>;

	constructor(private readonly catalogService: Deps["catalogService"]) {}

	async executor(payload: Payload): Promise<Response> {
		return this.catalogService.getProduct(payload.sku);
	}
}
