import { GET, schema } from "awilixify/http";

import type { AppModuleDef } from "./app.module.js";
import { StatusSchema } from "./status.schema.js";

type Deps = AppModuleDef["deps"];

export class StatusController {
	constructor(private readonly appService: Deps["appService"]) {}

	@GET("/api/status")
	@schema(StatusSchema)
	getStatus() {
		return this.appService.getStatus();
	}
}
