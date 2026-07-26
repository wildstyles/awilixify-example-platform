import type { CommandContract, Handler } from "awilixify";

import type {
	CreateReservationBody as Payload,
	CreateReservationResponse as Response,
} from "./dto/create-reservation.dto.js";
import type { Deps } from "./reservations.module.js";

export class CreateReservationCommandHandler
	implements Handler<CreateReservationCommandHandler["contract"]>
{
	static readonly key = "reservations/create";
	declare readonly contract: CommandContract<
		typeof CreateReservationCommandHandler.key,
		Payload,
		Response
	>;

	constructor(
		private readonly reservationsService: Deps["reservationsService"],
	) {}

	async executor(payload: Payload): Promise<Response> {
		return this.reservationsService.createReservation(payload);
	}
}
