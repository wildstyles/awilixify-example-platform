import type { Order, OrderLineInput } from "../../domain/order.types.js";
import type { Deps } from "./orders.module.js";

export class OrdersService {
	private nextOrderNumber = 1002;
	private readonly orders = new Map<string, Order>([
		[
			"order-1001",
			{
				customerId: "customer-001",
				fulfillmentStatus: "reserved",
				id: "order-1001",
				lines: [
					{
						name: "House Blend Coffee Beans",
						quantity: 2,
						sku: "coffee-beans",
						unitPrice: 18,
					},
				],
				status: "placed",
				total: 36,
			},
		],
	]);

	constructor(
		private readonly customersService: Deps["customersService"],
		private readonly pricingService: Deps["pricingService"],
		private readonly warehouseApiClient: Deps["warehouseApiClient"],
		private readonly warehouseMessagingClient: Deps["warehouseMessagingClient"],
		private readonly logger: Deps["logger"],
	) {}

	getOrder(id: string): Order {
		const order = this.orders.get(id);
		if (!order) {
			this.logger.warn({ order_id: id }, "Order not found");
			throw new Error(`Order ${id} was not found`);
		}

		return order;
	}

	async placeOrder(input: {
		customerId: string;
		lines: OrderLineInput[];
	}): Promise<Order> {
		this.customersService.getCustomer(input.customerId);
		const quote = this.pricingService.priceLines(input.lines);
		const orderId = `order-${this.nextOrderNumber++}`;
		this.logger.debug(
			{
				customer_id: input.customerId,
				line_count: input.lines.length,
				order_id: orderId,
			},
			"Pricing and reserving order",
		);

		const reservation = await this.warehouseApiClient.createReservation({
			orderId,
			lines: input.lines,
		});

		if (reservation.status !== "reserved" || !reservation.id) {
			this.logger.error(
				{ order_id: orderId, reservation_status: reservation.status },
				"Inventory reservation failed",
			);
			throw new Error(`Inventory reservation failed for order ${orderId}`);
		}

		const order: Order = {
			customerId: input.customerId,
			fulfillmentStatus: "reserved",
			id: orderId,
			lines: quote.lines,
			reservationId: reservation.id,
			status: "placed",
			total: quote.total,
		};
		this.orders.set(order.id, order);
		this.logger.info(
			{
				order_id: order.id,
				reservation_id: reservation.id,
				total: order.total,
			},
			"Order placed",
		);

		return order;
	}

	async queueInventoryReservation(input: {
		lines: OrderLineInput[];
		orderId: string;
	}): Promise<{ orderId: string; status: "queued" }> {
		const order = this.getOrder(input.orderId);
		order.fulfillmentStatus = "pending";
		delete order.reservationId;

		// await this.warehouseApiClient.createReservation({
		// 	orderId: input.orderId,
		// 	lines: input.lines,
		// });
		await this.warehouseMessagingClient.reserveInventory(input);
		this.logger.info(
			{ order_id: input.orderId },
			"Inventory reservation queued",
		);

		return {
			orderId: input.orderId,
			status: "queued",
		};
	}

	markInventoryReserved(input: {
		orderId: string;
		reservationId: string;
	}): void {
		const order = this.getOrder(input.orderId);
		order.fulfillmentStatus = "reserved";
		order.reservationId = input.reservationId;
	}
}
