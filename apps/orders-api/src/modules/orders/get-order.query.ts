import type { Handler, QueryContract } from "awilixify";

import type {
	GetOrderParams as Payload,
	OrderResponse as Response,
} from "./orders.dto.js";
import type { Deps } from "./orders.module.js";

export class GetOrderQueryHandler
	implements Handler<GetOrderQueryHandler["contract"]>
{
	static readonly key = "orders/get-order";
	declare readonly contract: QueryContract<
		typeof GetOrderQueryHandler.key,
		Payload,
		Response
	>;

	constructor(private readonly ordersService: Deps["ordersService"]) {}

	async executor(payload: Payload): Promise<Response> {
		return this.ordersService.getOrder(payload.id);
	}
}
