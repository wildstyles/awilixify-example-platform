import { POST, schema } from "awilixify/http";

import type { Request } from "../../integrations/http/types.js";
import { CreateShipmentSchema } from "./create-shipment.dto.js";
import type { Deps } from "./shipping.module.js";

export class ShippingController {
	constructor(private readonly commandMediator: Deps["commandMediator"]) {}

	@POST("/shipments")
	@schema(CreateShipmentSchema)
	createShipment(request: Request<typeof CreateShipmentSchema>) {
		return this.commandMediator.execute("shipping/create", request.body);
	}
}
