import { type Static, Type } from "@sinclair/typebox";
import { HttpStatus } from "awilixify/http";

export const GetStockParamsSchema = Type.Object({
	sku: Type.String({ minLength: 1 }),
});

export const GetStockResponseSchema = Type.Object({
	availableQuantity: Type.Integer({ minimum: 0 }),
	reservedQuantity: Type.Integer({ minimum: 0 }),
	sku: Type.String(),
});

export const GetStockSchema = {
	params: GetStockParamsSchema,
	response: {
		[HttpStatus.OK]: GetStockResponseSchema,
	},
};

export type GetStockParams = Static<typeof GetStockParamsSchema>;
export type GetStockResponse = Static<typeof GetStockResponseSchema>;
