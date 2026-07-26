import { Type } from "@sinclair/typebox";

export const StatusResponseSchema = Type.Object({
	service: Type.Literal("awilixify-example-platform"),
	status: Type.Literal("ok"),
});

export const StatusSchema = {
	response: {
		200: StatusResponseSchema,
	},
};
