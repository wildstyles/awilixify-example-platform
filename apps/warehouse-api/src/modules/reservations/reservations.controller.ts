import { POST, schema } from "awilixify/http";

import type { Request } from "../../integrations/http/types.js";
import { CreateReservationSchema } from "./dto/create-reservation.dto.js";
import type { Deps } from "./reservations.module.js";

export class ReservationsController {
	constructor(private readonly commandMediator: Deps["commandMediator"]) {}

	@POST("/reservations")
	@schema(CreateReservationSchema)
	createReservation(request: Request<typeof CreateReservationSchema>) {
		return this.commandMediator.execute("reservations/create", request.body);
	}
}
