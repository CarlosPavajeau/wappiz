FROM golang:1.26-alpine AS build
RUN apk add --no-cache git
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Railway injects RAILWAY_GIT_COMMIT_SHA as a build arg for GitHub-triggered
# deploys. `railway up` (used by the deploy pipeline) has no git metadata, so
# the pipeline sets APP_REVISION as a service variable, which Railway passes
# as a build arg. APP_VERSION is an escape hatch for builds where .git (and
# thus tags) is unavailable.
ARG RAILWAY_GIT_COMMIT_SHA=""
ARG APP_REVISION=""
ARG APP_VERSION=""
RUN set -eux; \
    VERSION="${APP_VERSION:-$(git describe --tags --abbrev=0 2>/dev/null || echo dev)}"; \
    REVISION="${RAILWAY_GIT_COMMIT_SHA:-${APP_REVISION:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}}"; \
    BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"; \
    CGO_ENABLED=0 go build \
      -ldflags "-s -w \
        -X wappiz/pkg/buildinfo.Version=${VERSION} \
        -X wappiz/pkg/buildinfo.Revision=${REVISION} \
        -X wappiz/pkg/buildinfo.BuildTime=${BUILD_TIME}" \
      -o /out/wappiz ./cmd/api

FROM gcr.io/distroless/static-debian12
COPY --from=build /out/wappiz /wappiz
ENTRYPOINT ["/wappiz"]
