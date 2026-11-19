// Railway infrastructure for Wappiz (production): the Go API, built from the Dockerfile at the repository
// root. The database (PlanetScale), Redis and the web app (Vercel) live outside Railway.
//
// Autodeploy is off in the service's settings (the IaC has no field for it): .github/workflows/deploy.yml
// migrates the database first and only then deploys the API at that commit, through
// scripts/railway-deploy.sh. Applied with the Railway CLI by hand, never on push:
//   railway config plan    (preview)
//   railway config apply   (asks for confirmation)
//
// Secrets are preserve(): their values live only in Railway (set them sealed in the dashboard), so this
// file never holds a password or key. Every variable the API uses must be listed here: plan shows any
// variable that exists in Railway but not here as a removal.
import { defineRailway, github, preserve, project, service } from "railway/iac";

const MB = 1024 * 1024;

export default defineRailway((ctx) => {
  const api = service("api", {
    source: github("CarlosPavajeau/wappiz", { branch: "main" }),
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "Dockerfile",
      // The web app lives in web/ and deploys to Vercel: its changes must not rebuild the API.
      watchPatterns: ["cmd/**", "internal/**", "pkg/**", "svc/**", "go.mod", "go.sum", "Dockerfile"],
    },
    deploy: {
      // Railway routes traffic to a deployment only once this answers 200. The endpoint also reports the
      // revision it was built from, which the deploy script waits for.
      healthcheckPath: "/health/ready",
      healthcheckTimeout: 120,
      // sleepApplication stays unset, which is off: a sleeping API would miss WhatsApp webhooks and delay
      // reminders. Railway reports false as null, so setting it would make plan always show a change.
      limitOverride: { containers: { cpu: 1, memoryBytes: 512 * MB } },
    },
    // Virginia, next to PlanetScale (AWS us-east-1).
    replicas: { "us-east4-eqdc4a": 1 },
    // Behind the Cloudflare proxy. Not api.wappiz: Universal SSL covers one subdomain level only.
    domains: [{ domain: "api-wappiz.cantte.com", port: 80 }],
    // No TCP proxy: metrics leave over OTLP, so the Prometheus port stays private.
    networking: { privateNetworkEndpoint: "wappiz-api" },
    env: {
      PORT: "80",
      ENVIRONMENT: "production",
      GIN_MODE: "release",
      REGION: "us-east4-eqdc4a",
      INSTANCE_ID: "${{RAILWAY_SERVICE_ID}}",
      // The deployed commit, set by scripts/railway-deploy.sh before each deploy and passed to the
      // Docker build as an argument: /health/ready reports it.
      APP_REVISION: preserve(),

      DATABASE_URL: preserve(),
      REDIS_URL: preserve(),
      BUFFER_CAP: "2000",
      // The API sits behind the Cloudflare proxy: the client IP the rate limits key on comes from this header.
      // Gin reads it unconditionally, so no public route may reach Railway without passing through Cloudflare.
      TRUSTED_PLATFORM: "CF-Connecting-IP",

      ENCRYPTION_KEY: preserve(),
      CLOUDFLARE_TURNSTILE_SECRET_KEY: preserve(),
      ADMIN_EMAIL: preserve(),

      // Set in Railway but not read by the API (it verifies JWTs with the keys in the jwks table, and the
      // origin check is not built yet). Listed so plan does not remove them; drop them here to delete.
      JWKS_ENDPOINT: "https://wappiz.cantte.com/api/auth/.well-known/jwks.json",
      JWT_SECRET: preserve(),
      ORIGIN_SECRET: preserve(),

      WHATSAPP_BASE_URL: "https://graph.facebook.com",
      WHATSAPP_API_VERSION: "v19.0",
      WHATSAPP_APP_SECRET: preserve(),
      WEBHOOK_VERIFY_TOKEN: preserve(),
      WEBHOOK_WORKERS: "4",

      RESEND_API_KEY: preserve(),
      RESEND_FROM_EMAIL: "no-reply@mail.cantte.com",

      POSTHOG_HOST: "https://us.i.posthog.com",
      POSTHOG_API_KEY: preserve(),

      // Telemetry over OTLP to Grafana Cloud; the headers carry a write-only access token.
      OTEL_EXPORTER_OTLP_ENDPOINT: "https://otlp-gateway-prod-us-central-0.grafana.net/otlp",
      OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf",
      OTEL_EXPORTER_OTLP_HEADERS: preserve(),
      OTEL_RESOURCE_ATTRIBUTES: "deployment.environment.name=production",
      PROMETHEUS_PORT: "9090",
      LOG_SAMPLE_RATE: "0.25",
      LOG_SLOW_THRESHOLD: "1s",
    },
  });

  return project(ctx.projectName ?? "wappiz", {
    resources: [api],
  });
});
