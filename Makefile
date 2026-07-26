define DEVTOOLS_TARGETS
- serviceName: orders
  url: http://127.0.0.1:3221
- serviceName: warehouse
  url: http://127.0.0.1:3223
endef
export DEVTOOLS_TARGETS

.PHONY: dev-linked

dev-linked:
	pnpm --dir ../awilixify build
	pnpm --dir ../awilixify-cli build
	pnpm --dir ../awilixify-devtools build
	mkdir -p node_modules/@awilixify apps/orders-api/node_modules/@awilixify apps/warehouse-api/node_modules/@awilixify
	ln -sfn "$(abspath ../awilixify-cli)" node_modules/@awilixify/cli
	ln -sfn "$(abspath ../awilixify)" ../awilixify-devtools/node_modules/awilixify
	ln -sfn "$(abspath ../awilixify)" apps/orders-api/node_modules/awilixify
	ln -sfn "$(abspath ../awilixify-devtools)" apps/orders-api/node_modules/@awilixify/devtools
	ln -sfn "$(abspath ../awilixify-cli)" apps/orders-api/node_modules/@awilixify/cli
	ln -sfn "$(abspath ../awilixify)" apps/warehouse-api/node_modules/awilixify
	ln -sfn "$(abspath ../awilixify-devtools)" apps/warehouse-api/node_modules/@awilixify/devtools
	ln -sfn "$(abspath ../awilixify)" packages/rabbitmq/node_modules/awilixify
	docker compose up --detach rabbitmq
	pnpm exec concurrently --kill-others \
		--names orders,warehouse,core,devtools,ui \
		--prefix-colors cyan,blue,magenta,yellow,green \
		"pnpm --dir apps/orders-api exec tsx watch --include '../../../awilixify/dist/**/*.js' --include '../../../awilixify-devtools/dist/**/*.js' src/main.ts" \
		"pnpm --dir apps/warehouse-api exec tsx watch --include '../../../awilixify/dist/**/*.js' --include '../../../awilixify-devtools/dist/**/*.js' src/main.ts" \
		"pnpm --dir ../awilixify build:watch" \
		"pnpm --dir ../awilixify-devtools build:watch" \
		"pnpm --dir ../awilixify-devtools-ui dev"
