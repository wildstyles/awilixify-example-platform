import type { Shipment } from "../../domain/warehouse.types.js";
import type { Deps } from "./shipping.module.js";

export class ShippingService {
	private nextShipmentNumber = 4001;

	constructor(private readonly pickingService: Deps["pickingService"]) {}

	createShipment(input: {
		address: string;
		orderId: string;
		reservationId: string;
	}): Shipment {
		const pickList = this.pickingService.createPickList(input.reservationId);

		return {
			address: input.address,
			id: `shipment-${this.nextShipmentNumber++}`,
			orderId: input.orderId,
			pickListId: pickList.id,
			status: "label-created",
		};
	}
}
