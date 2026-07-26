import type { CommandContract, Handler } from "awilixify";

import type {
	CreateShipmentBody as Payload,
	CreateShipmentResponse as Response,
} from "./create-shipment.dto.js";
import type { Deps } from "./shipping.module.js";

export class CreateShipmentCommandHandler
	implements Handler<CreateShipmentCommandHandler["contract"]>
{
	static readonly key = "shipping/create";
	declare readonly contract: CommandContract<
		typeof CreateShipmentCommandHandler.key,
		Payload,
		Response
	>;

	constructor(private readonly shippingService: Deps["shippingService"]) {}

	async executor(payload: Payload): Promise<Response> {
		return this.shippingService.createShipment(payload);
	}
}
