import { createModule, type ModuleDef } from "awilixify";

import { CustomersModule } from "../customers/customers.module.js";
import { PricingModule } from "../pricing/pricing.module.js";
import { WarehouseGatewayModule } from "../warehouse-gateway/warehouse-gateway.module.js";
import { WarehouseMessagingModule } from "../warehouse-messaging/warehouse-messaging.module.js";
import { GetOrderQueryHandler } from "./get-order.query.js";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";
import { PlaceOrderCommandHandler } from "./place-order.command.js";

export type OrdersModuleDef = ModuleDef<{
	imports: [
		typeof CustomersModule,
		typeof PricingModule,
		typeof WarehouseGatewayModule,
		typeof WarehouseMessagingModule,
	];
	providers: {
		ordersService: OrdersService;
	};
	queryHandlers: [GetOrderQueryHandler];
	commandHandlers: [PlaceOrderCommandHandler];
}>;

export type Deps = OrdersModuleDef["deps"];

export const OrdersModule = createModule<OrdersModuleDef>({
	name: "OrdersModule",
	imports: [
		CustomersModule,
		PricingModule,
		WarehouseGatewayModule,
		WarehouseMessagingModule,
	],
	controllers: [OrdersController],
	providers: {
		ordersService: OrdersService,
	},
	queryHandlers: [GetOrderQueryHandler],
	commandHandlers: [PlaceOrderCommandHandler],
});
