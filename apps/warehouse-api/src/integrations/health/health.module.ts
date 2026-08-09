import { RabbitMqRegistryModule } from "@awilixify-example-platform/rabbitmq";
import { createModule, type ModuleDef } from "awilixify";

import { ConfigModule } from "../config/config.module.js";
import { HealthController } from "./health.controller.js";

type HealthModuleDef = ModuleDef<{
	imports: [typeof ConfigModule, typeof RabbitMqRegistryModule];
}>;

export type Deps = HealthModuleDef["deps"];

export const HealthModule = createModule<HealthModuleDef>({
	name: "HealthModule",
	controllers: [HealthController],
	imports: [ConfigModule, RabbitMqRegistryModule],
});
