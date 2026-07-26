import type { CommandContract, Handler } from "awilixify";

import type {
	PlaceOrderBody as Payload,
	OrderResponse as Response,
} from "./orders.dto.js";
import type { Deps } from "./orders.module.js";

export class PlaceOrderCommandHandler
	implements Handler<PlaceOrderCommandHandler["contract"]>
{
	static readonly key = "orders/place-order";
	declare readonly contract: CommandContract<
		typeof PlaceOrderCommandHandler.key,
		Payload,
		Response
	>;

	constructor(private readonly ordersService: Deps["ordersService"]) {}

	async executor(payload: Payload): Promise<Response> {
		return this.ordersService.placeOrder(payload);
	}
}
