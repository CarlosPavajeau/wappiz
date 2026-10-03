package api

import (
	"context"
	"time"
	"wappiz/pkg/logger"

	"github.com/joho/godotenv"
	"github.com/sethvargo/go-envconfig"
)

// LoggingConfig controls log sampling. Events faster than SlowThreshold are
// emitted with probability SampleRate; events at or above the threshold are
// always emitted.
type LoggingConfig struct {
	// SampleRate is the probability (0.0–1.0) of emitting a fast log event.
	// Set to 1.0 to log everything.
	SampleRate float64 `env:"LOG_SAMPLE_RATE"`

	// SlowThreshold is the duration above which a request is always logged
	// regardless of SampleRate.
	SlowThreshold time.Duration `env:"LOG_SLOW_THRESHOLD"`
}

// TracingConfig controls OpenTelemetry tracing and metrics export.
// SampleRate determines what fraction of traces are exported; the rest are dropped
// to reduce storage costs and processing overhead.
type TracingConfig struct {

	// SampleRate is the probability (0.0–1.0) that a trace is sampled.
	SampleRate float64 `env:"LOG_SAMPLE_RATE"`
}

// MetricsConfig controls Prometheus metrics exposition.
type MetricsConfig struct {
	// PrometheusPort is the TCP port where Prometheus-compatible metrics are served.
	// Set to 0 to disable metrics exposure.
	PrometheusPort int `env:"PROMETHEUS_PORT"`
}

type Observability struct {
	Tracing *TracingConfig `env:", noinit"`
	Logging *LoggingConfig `env:", noinit"`
	Metrics *MetricsConfig `env:", noinit"`
}

type WebhookConfig struct {
	Workers   int `env:"WEBHOOK_WORKERS, default=4"`
	BufferCap int `env:"BUFFER_CAP, default=2000"`
}

// Config holds all runtime configuration values for the API server,
// populated from environment variables (or a .env file).
type Config struct {
	// InstanceID identifies this particular API server instance.
	InstanceID string `env:"INSTANCE_ID"`
	// Region is the geographic region identifier (e.g. "us-east-1", "eu-west-1").
	Region string `env:"REGION"`
	// DatabaseURL is the connection string for the PostgreSQL database (DATABASE_URL).
	DatabaseURL string `env:"DATABASE_URL"`
	// RedisURL is the connection string for the Redis instance (REDIS_URL)
	RedisURL string `env:"REDIS_URL"`
	// Port is the address the HTTP server listens on (PORT). Defaults to ":8080".
	Port string `env:"PORT, default=:8080"`
	// WhatsappBaseURL is the base URL for the WhatsApp Cloud API (WHATSAPP_BASE_URL).
	// Defaults to "https://graph.facebook.com".
	WhatsappBaseURL string `env:"WHATSAPP_BASE_URL, default=https://graph.facebook.com"`
	// WhatsappAPIVersion is the WhatsApp Cloud API version to use (WHATSAPP_API_VERSION).
	// Defaults to "v19.0".
	WhatsappAPIVersion string `env:"WHATSAPP_API_VERSION, default=v19.0"`
	// WebhookVerifyToken is the secret token used to verify incoming webhook subscriptions
	// from Meta (WEBHOOK_VERIFY_TOKEN).
	WebhookVerifyToken string `env:"WEBHOOK_VERIFY_TOKEN, required"`
	// WhatsappAppSecret is the app secret used to validate the X-Hub-Signature-256 header
	// on incoming webhook payloads (WHATSAPP_APP_SECRET).
	WhatsappAppSecret string `env:"WHATSAPP_APP_SECRET, required"`
	// EncryptionKey is the key used to encrypt sensitive data at rest (ENCRYPTION_KEY).
	EncryptionKey string `env:"ENCRYPTION_KEY, required"`
	// AdminEmail is the email address of the default admin user (ADMIN_EMAIL).
	AdminEmail string `env:"ADMIN_EMAIL, required"`
	// ResendAPIKey is the API key for the Resend email delivery service (RESEND_API_KEY).
	ResendAPIKey string `env:"RESEND_API_KEY, required"`
	// ResendFromEmail is the sender address used for outgoing emails (RESEND_FROM_EMAIL).
	ResendFromEmail string `env:"RESEND_FROM_EMAIL, required"`
	// TurnstileSecretKey is the Cloudflare Turnstile secret used to verify
	// captcha tokens on public booking requests (CLOUDFLARE_TURNSTILE_SECRET_KEY).
	TurnstileSecretKey string `env:"CLOUDFLARE_TURNSTILE_SECRET_KEY, required"`
	// JWTIssuer is the expected "iss" claim value for incoming JWTs (JWT_ISSUER).
	// Optional — when empty the issuer claim is not validated.
	JWTIssuer string `env:"JWT_ISSUER"`
	// TrustedProxies lists the comma-separated IPs or CIDRs of the reverse
	// proxies in front of the API (TRUSTED_PROXIES). X-Forwarded-For is only
	// honoured when the direct peer is one of them. Empty trusts no proxy, so
	// the client IP is the TCP peer address and cannot be spoofed by a header;
	// per-IP rate limits on the public routes depend on this.
	TrustedProxies []string `env:"TRUSTED_PROXIES"`
	// TrustedPlatform names a header set by the edge platform that carries the
	// real client IP, e.g. "CF-Connecting-IP" behind Cloudflare
	// (TRUSTED_PLATFORM). It is read unconditionally, so only set it when the
	// API is reachable exclusively through that platform.
	TrustedPlatform string `env:"TRUSTED_PLATFORM"`
	Observability   Observability
	Webhook         WebhookConfig
	// Environment can be sandbox or production, used to filter active plans in the database
	Environment string `env:"ENVIRONMENT, default=production"`
}

// LoadConfiguration reads configuration from a .env file if present, then falls back
// to the process environment. Fields without defaults will cause the process to exit if
// their corresponding environment variable is not set.
func LoadConfiguration() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		logger.Info("no .env file found, using environment variables")
	}

	var cfg Config

	if err := envconfig.Process(context.Background(), &cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}
