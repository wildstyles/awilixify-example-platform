import { type Static, Type } from "@sinclair/typebox";
import { HttpStatus } from "awilixify/http";

export const ReservationLineSchema = Type.Object({
	quantity: Type.Integer({ minimum: 1 }),
	sku: Type.String({ minLength: 1 }),
});

export const CreateReservationBodySchema = Type.Object({
	lines: Type.Array(ReservationLineSchema, { minItems: 1 }),
	orderId: Type.String({ minLength: 1 }),
});

export const CreateReservationResponseSchema = Type.Object({
	id: Type.String(),
	lines: Type.Array(ReservationLineSchema),
	orderId: Type.String(),
	status: Type.Literal("reserved"),
});

export const CreateReservationSchema = {
	tags: ["reservations"],
	body: CreateReservationBodySchema,
	response: {
		[HttpStatus.OK]: CreateReservationResponseSchema,
	},
};

export type CreateReservationBody = Static<typeof CreateReservationBodySchema>;
export type CreateReservationResponse = Static<
	typeof CreateReservationResponseSchema
>;
