import { publishesOperation } from "awilixify";
import type {
	Reservation,
	ReservationLine,
} from "../../domain/warehouse.types.js";
import { ReservationCreatedEvent } from "./events/reservation-created.event.js";
import type { Deps } from "./reservations.module.js";

export class ReservationsService {
	private nextReservationNumber = 2001;
	private readonly reservations = new Map<string, Reservation>();

	constructor(
		private readonly inventoryService: Deps["inventoryService"],
		private readonly rabbitPublisher: Deps["rabbitPublisher"],
	) {}

	@publishesOperation(ReservationCreatedEvent)
	async createReservation(input: {
		lines: ReservationLine[];
		orderId: string;
	}): Promise<Reservation> {
		this.inventoryService.reserve(input.lines);

		const reservation: Reservation = {
			id: `reservation-${this.nextReservationNumber++}`,
			lines: input.lines,
			orderId: input.orderId,
			status: "reserved",
		};

		this.reservations.set(reservation.id, reservation);

		await this.rabbitPublisher.publish({
			message: this.rabbitPublisher.messages.reservationCreated,
			payload: {
				orderId: reservation.orderId,
				reservationId: reservation.id,
			},
		});

		return reservation;
	}

	getReservation(id: string): Reservation {
		const reservation = this.reservations.get(id);
		if (!reservation) {
			throw new Error(`Reservation ${id} was not found`);
		}

		return reservation;
	}
}
