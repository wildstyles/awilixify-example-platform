import { type Static, Type } from "@sinclair/typebox";
import { HttpStatus } from "awilixify/http";

export const CreateShipmentBodySchema = Type.Object({
	address: Type.String({ minLength: 1 }),
	orderId: Type.String({ minLength: 1 }),
	reservationId: Type.String({ minLength: 1 }),
});

export const CreateShipmentResponseSchema = Type.Object({
	address: Type.String(),
	id: Type.String(),
	orderId: Type.String(),
	pickListId: Type.String(),
	status: Type.Literal("label-created"),
});

export const CreateShipmentSchema = {
	body: CreateShipmentBodySchema,
	response: {
		[HttpStatus.OK]: CreateShipmentResponseSchema,
	},
};

export type CreateShipmentBody = Static<typeof CreateShipmentBodySchema>;
export type CreateShipmentResponse = Static<
	typeof CreateShipmentResponseSchema
>;
