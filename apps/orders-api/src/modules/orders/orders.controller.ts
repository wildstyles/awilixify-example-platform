import { GET, POST, schema } from "awilixify/http";

import type { Request } from "../../integrations/http/types.js";
import {
	GetOrderSchema,
	PlaceOrderSchema,
	QueueInventoryReservationSchema,
} from "./orders.dto.js";
import type { Deps } from "./orders.module.js";

export class OrdersController {
	constructor(
		private readonly queryMediator: Deps["queryMediator"],
		private readonly commandMediator: Deps["commandMediator"],
		private readonly ordersService: Deps["ordersService"],
	) {}

	@GET("/orders/:id")
	@schema(GetOrderSchema)
	getOrder(request: Request<typeof GetOrderSchema>) {
		return this.queryMediator.execute("orders/get-order", request.params);
	}

	@POST("/orders")
	@schema(PlaceOrderSchema)
	placeOrder(request: Request<typeof PlaceOrderSchema>) {
		return this.commandMediator.execute("orders/place-order", request.body);
	}

	@POST("/orders/:id/inventory-reservations")
	@schema(QueueInventoryReservationSchema)
	queueInventoryReservation(
		request: Request<typeof QueueInventoryReservationSchema>,
	) {
		return this.ordersService.queueInventoryReservation({
			lines: request.body.lines,
			orderId: request.params.id,
		});
	}
}
