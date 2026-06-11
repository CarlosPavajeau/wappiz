.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: install-go
install-go: ## Install Go dependencies
	go mod download

.PHONY: install
install: install-go ## Install all dependencies
	cd web && bun install --frozen-lockfile

.PHONY: generate-sql
generate-sql:
	@rm -rf ./web/packages/db/out
	@cd web/packages/db && bun run db:generate --name=init --breakpoints=false --out=out --dialect=postgresql --schema=./src/schema/index.ts
	@rm -rf ./pkg/db/schema && mkdir -p ./pkg/db/schema
	@awk -v dir=./pkg/db/schema -f ./scripts/split-schema.awk \
		$$(find ./web/packages/db/out -name "migration.sql" -type f | head -1)
	@rm -rf ./web/packages/db/out

.PHONY: generate
generate:
	rm ./pkg/db/*_generated.go || true
	go generate ./...
	go fmt ./...

.PHONY: fmt
fmt: ## Format code
	go fmt ./...
	cd web && bun run fix

.PHONY: test
test: ## Run app tests
	bazel test //...

.PHONY: bazel
bazel: ## Sync BUILD.bazel
	bazel mod tidy
	bazel run //:gazelle

.PHONY: build
build:  ## Build all artifacts (binaries land in ./bin)
	bazel build //...
	@mkdir -p bin
	@cp -f "$$(bazel cquery --ui_event_filters=-info --noshow_progress //:wappiz --output=files)" bin/wappiz && chmod +w bin/wappiz
