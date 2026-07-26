import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { GET } from "awilixify/http";

import type { Deps } from "./asyncapi-docs.module.js";

type HttpReply = {
	header(name: string, value: string): HttpReply;
	send(payload: string): unknown;
	type(contentType: string): HttpReply;
};

const rendererSource = await readFile(
	fileURLToPath(
		import.meta.resolve(
			"@asyncapi/react-component/browser/standalone/index.js",
		),
	),
	"utf8",
);
const rendererStyles = await readFile(
	fileURLToPath(
		import.meta.resolve("@asyncapi/react-component/styles/default.min.css"),
	),
	"utf8",
);

export class RabbitMqAsyncApiDocsController {
	constructor(
		private readonly rabbitMqAsyncApiDocument: Deps["rabbitMqAsyncApiDocument"],
		private readonly rabbitMqAsyncApiDocsOptions: Deps["rabbitMqAsyncApiDocsOptions"],
	) {}

	@GET("/asyncapi.json")
	getDocument() {
		return this.rabbitMqAsyncApiDocument.createDocument(
			this.rabbitMqAsyncApiDocsOptions,
		);
	}

	@GET("/asyncapi-docs/assets/renderer.js")
	getRenderer(_request: unknown, reply: HttpReply) {
		return reply
			.header("Cache-Control", "public, max-age=31536000, immutable")
			.type("application/javascript")
			.send(rendererSource);
	}

	@GET("/asyncapi-docs/assets/styles.css")
	getRendererStyles(_request: unknown, reply: HttpReply) {
		return reply
			.header("Cache-Control", "public, max-age=31536000, immutable")
			.type("text/css")
			.send(rendererStyles);
	}

	@GET("/asyncapi-docs")
	async getDocumentation(_request: unknown, reply: HttpReply) {
		const document = JSON.stringify(
			await this.rabbitMqAsyncApiDocument.createDocument(
				this.rabbitMqAsyncApiDocsOptions,
			),
		).replaceAll("<", "\\u003c");

		return reply.type("text/html").send(`<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>${this.rabbitMqAsyncApiDocsOptions.title}</title>
		<link rel="stylesheet" href="/asyncapi-docs/assets/styles.css" />
		<style>
			body { margin: 0; font-family: system-ui, sans-serif; }
		</style>
	</head>
	<body>
		<div id="asyncapi"></div>
		<script src="/asyncapi-docs/assets/renderer.js"></script>
		<script>
			AsyncApiStandalone.render(
				{
					schema: ${document},
					config: {
						show: { sidebar: true },
						sidebar: { showOperations: "byDefault" }
					}
				},
				document.getElementById("asyncapi")
			);
		</script>
	</body>
</html>`);
	}
}
