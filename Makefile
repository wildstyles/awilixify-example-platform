define DEVTOOLS_TARGETS
- serviceName: orders
  url: http://127.0.0.1:3221
- serviceName: warehouse
  url: http://127.0.0.1:3223
endef
export DEVTOOLS_TARGETS

IMAGE_PREFIX := awilixify-example-platform
project ?=

image_prefix := $(if $(registry),$(registry)/)$(IMAGE_PREFIX)

DOCKERFILE := ./docker/Dockerfile.service

# -----------------------------------------------------------------------------
# Docker images
# -----------------------------------------------------------------------------

.PHONY: build build_all build_and_push_to_ecr build_orders_api build_warehouse_api

build:
	@test -n "$(project)" || (echo "project is required" >&2; exit 2)
	@test -n "$(tag)" || (echo "tag is required" >&2; exit 2)
	docker build \
		--build-arg SERVICE=$(project) \
		--tag $(image_prefix)/$(project):$(tag) \
		--file $(DOCKERFILE) \
		.

build_and_push_to_ecr:
	@test -n "$(registry)" || (echo "registry is required" >&2; exit 2)
	$(MAKE) build registry=$(registry) project=$(project) tag=$(tag)
	docker push $(image_prefix)/$(project):$(tag)

build_orders_api:
	$(MAKE) build registry=$(registry) project=orders-api tag=$(tag)

build_warehouse_api:
	$(MAKE) build registry=$(registry) project=warehouse-api tag=$(tag)

build_all: build_orders_api build_warehouse_api

# -----------------------------------------------------------------------------
# Local Kubernetes
# -----------------------------------------------------------------------------

MINIKUBE_PROFILE := awilixify-example-platform
KUBE_NAMESPACE := awilixify-example-platform
HELM_RELEASE := awilixify-example-platform-local
HELM_CHART := ./helm
HELM_LOCAL_VALUES := ./helm/values.local.yaml

.PHONY: helm_upgrade k8s_delete k8s_up minikube_load minikube_start

minikube_start:
	# Leave memory for Docker Desktop itself and other host containers.
	minikube start --profile $(MINIKUBE_PROFILE) --driver docker --cpus 4 --memory 4g
	minikube addons enable metrics-server --profile $(MINIKUBE_PROFILE)

minikube_load:
	@test -n "$(tag)" || (echo "tag is required" >&2; exit 2)
	# Minikube has its own image store, so load the locally built images before
	# installing the Helm release.
	minikube image load $(IMAGE_PREFIX)/orders-api:$(tag) --profile $(MINIKUBE_PROFILE)
	minikube image load $(IMAGE_PREFIX)/warehouse-api:$(tag) --profile $(MINIKUBE_PROFILE)

helm_upgrade:
	@test -n "$(tag)" || (echo "tag is required" >&2; exit 2)
	helm upgrade $(HELM_RELEASE) $(HELM_CHART) \
		--kube-context $(MINIKUBE_PROFILE) \
		--namespace $(KUBE_NAMESPACE) \
		--create-namespace \
		--install \
		--wait \
		--timeout 3m \
		--values $(HELM_LOCAL_VALUES) \
		--set-string global.image.tag=$(tag)

k8s_up:
	@test -n "$(tag)" || (echo "tag is required" >&2; exit 2)
	# Complete local workflow: build images, start the cluster, load the images,
	# and install or upgrade the Helm release with the same explicit tag.
	$(MAKE) build_all tag=$(tag)
	$(MAKE) minikube_start
	$(MAKE) minikube_load tag=$(tag)
	$(MAKE) helm_upgrade tag=$(tag)

k8s_delete:
	minikube delete --profile $(MINIKUBE_PROFILE)

# -----------------------------------------------------------------------------
# Linked workspace development
# -----------------------------------------------------------------------------

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
