import type { PickList } from "../../domain/warehouse.types.js";

export class PickingService {
	private nextPickListNumber = 3001;

	createPickList(reservationId: string): PickList {
		return {
			id: `pick-${this.nextPickListNumber++}`,
			reservationId,
			status: "ready",
		};
	}
}
