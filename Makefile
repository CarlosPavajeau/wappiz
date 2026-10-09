.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: install-go
install-go: ## Install Go dependencies
	go mod download

.PHONY: install
install: install-go ## Install all dependencies
	cd web && pnpm install --frozen-lockfile

.PHONY: generate-sql
generate-sql:
	@rm -rf ./web/packages/db/out
	@cd web/packages/db && pnpm db:generate --name=init --breakpoints=false --out=out --dialect=postgresql --schema=./src/schema/index.ts
	@rm -rf ./pkg/db/schema && mkdir -p ./pkg/db/schema
	@awk -v dir=./pkg/db/schema -f ./scripts/split-schema.awk \
		$$(find ./web/packages/db/out -name "migration.sql" -type f | head -1)
	@cp ./scripts/schema-extras.sql ./pkg/db/schema/zz_schema_extras.sql
	@rm -rf ./web/packages/db/out

.PHONY: generate
generate:
	rm ./pkg/db/*_generated.go || true
	go generate ./...
	go fmt ./...

.PHONY: fmt
fmt: ## Format code
	go fmt ./...
	cd web && pnpm fix

.PHONY: test
test: test-go test-web ## Run all tests

.PHONY: test-go
test-go: ## Run Go tests
	go test ./...

.PHONY: test-web
test-web: ## Run web tests
	cd web && pnpm test

.PHONY: build
build:  ## Build all artifacts (binaries land in ./bin)
	CGO_ENABLED=0 go build -o bin/wappiz ./cmd/api

##@ Local Docker stack

.PHONY: dev-up
dev-up: ## Start Postgres, Redis and the API in Docker (API on :8080)
	@test -f .env.docker || cp .env.docker.example .env.docker
	docker compose up -d --build

LOCAL_DATABASE_URL := postgres://wappiz:wappiz@localhost:5432/wappiz?sslmode=disable

# Runs drizzle-kit directly, not through turbo: turbo's strict env mode drops
# DATABASE_URL, and drizzle.config.ts would then fall back to the URL in
# web/apps/web/.env (production). The guard aborts unless the URL drizzle will
# use resolves to localhost.
.PHONY: dev-migrate
dev-migrate: ## Apply Drizzle migrations to the local Docker database
	cd web/packages/db && DATABASE_URL='$(LOCAL_DATABASE_URL)' node -e "\
		require('dotenv').config({ path: '../../apps/web/.env', quiet: true }); \
		const host = new URL(process.env.DATABASE_URL).hostname; \
		if (host !== 'localhost') { console.error('refusing to migrate non-local database: ' + host); process.exit(1) }"
	cd web/packages/db && DATABASE_URL='$(LOCAL_DATABASE_URL)' pnpm exec drizzle-kit migrate

.PHONY: dev-logs
dev-logs: ## Follow the API container logs
	docker compose logs -f api

.PHONY: dev-down
dev-down: ## Stop the local Docker stack (data is kept)
	docker compose down
