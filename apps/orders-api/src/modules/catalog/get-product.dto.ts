import { type Static, Type } from "@sinclair/typebox";
import { HttpStatus } from "awilixify/http";

export const GetProductParamsSchema = Type.Object({
	sku: Type.String({ minLength: 1 }),
});

export const GetProductResponseSchema = Type.Object({
	name: Type.String(),
	price: Type.Number({ minimum: 0 }),
	sku: Type.String(),
});

export const GetProductSchema = {
	params: GetProductParamsSchema,
	response: {
		[HttpStatus.OK]: GetProductResponseSchema,
	},
};

export type GetProductParams = Static<typeof GetProductParamsSchema>;
export type GetProductResponse = Static<typeof GetProductResponseSchema>;
