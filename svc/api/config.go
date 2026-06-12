package api

import (
	"os"
	"strconv"
	"time"
	"wappiz/pkg/logger"

	"github.com/joho/godotenv"
)

// LoggingConfig controls log sampling. Events faster than SlowThreshold are
// emitted with probability SampleRate; events at or above the threshold are
// always emitted.
type LoggingConfig struct {
	// SampleRate is the probability (0.0–1.0) of emitting a fast log event.
	// Set to 1.0 to log everything.
	SampleRate float64

	// SlowThreshold is the duration above which a request is always logged
	// regardless of SampleRate.
	SlowThreshold time.Duration
}

// TracingConfig controls OpenTelemetry tracing and metrics export.
// SampleRate determines what fraction of traces are exported; the rest are dropped
// to reduce storage costs and processing overhead.
type TracingConfig struct {

	// SampleRate is the probability (0.0–1.0) that a trace is sampled.
	SampleRate float64
}

// MetricsConfig controls Prometheus metrics exposition.
type MetricsConfig struct {
	// PrometheusPort is the TCP port where Prometheus-compatible metrics are served.
	// Set to 0 to disable metrics exposure.
	PrometheusPort int
}

type Observability struct {
	Tracing *TracingConfig
	Logging *LoggingConfig
	Metrics *MetricsConfig
}

type WebhookConfig struct {
	Workers   int
	BufferCap int
}

// Config holds all runtime configuration values for the API server,
// populated from environment variables (or a .env file).
type Config struct {
	// InstanceID identifies this particular API server instance.
	InstanceID string
	// Region is the geographic region identifier (e.g. "us-east-1", "eu-west-1").
	Region string
	// DatabaseURL is the connection string for the PostgreSQL database (DATABASE_URL).
	DatabaseURL string
	// RedisURL is the connection string for the Redis instance (REDIS_URL)
	RedisURL string
	// Port is the address the HTTP server listens on (PORT). Defaults to ":8080".
	Port string
	// WhatsappBaseURL is the base URL for the WhatsApp Cloud API (WHATSAPP_BASE_URL).
	// Defaults to "https://graph.facebook.com".
	WhatsappBaseURL string
	// WhatsappAPIVersion is the WhatsApp Cloud API version to use (WHATSAPP_API_VERSION).
	// Defaults to "v19.0".
	WhatsappAPIVersion string
	// WebhookVerifyToken is the secret token used to verify incoming webhook subscriptions
	// from Meta (WEBHOOK_VERIFY_TOKEN).
	WebhookVerifyToken string
	// WhatsappAppSecret is the app secret used to validate the X-Hub-Signature-256 header
	// on incoming webhook payloads (WHATSAPP_APP_SECRET).
	WhatsappAppSecret string
	// EncryptionKey is the key used to encrypt sensitive data at rest (ENCRYPTION_KEY).
	EncryptionKey string
	// AdminEmail is the email address of the default admin user (ADMIN_EMAIL).
	AdminEmail string
	// ResendAPIKey is the API key for the Resend email delivery service (RESEND_API_KEY).
	ResendAPIKey string
	// ResendFromEmail is the sender address used for outgoing emails (RESEND_FROM_EMAIL).
	ResendFromEmail string
	// JWTIssuer is the expected "iss" claim value for incoming JWTs (JWT_ISSUER).
	// Optional — when empty the issuer claim is not validated.
	JWTIssuer     string
	Observability Observability
	Webhook       WebhookConfig
	// Environment can be sandbox or production, used to filter active plans in the database
	Environment string
}

// LoadConfiguration reads configuration from a .env file if present, then falls back
// to the process environment. Fields without defaults will cause the process to exit if
// their corresponding environment variable is not set.
func LoadConfiguration() Config {
	if err := godotenv.Load(); err != nil {
		logger.Info("no .env file found, using environment variables")
	}

	var sampleRate float64
	if srStr := getOrDefault("LOG_SAMPLE_RATE", "1.0"); srStr != "" {
		var err error
		sampleRate, err = strconv.ParseFloat(srStr, 64)
		if err != nil {
			sampleRate = 1.0
		}
	}

	var slowThreshold time.Duration
	if slowThresholdStr := getOrDefault("LOG_SLOW_THRESHOLD", "5s"); slowThresholdStr != "" {
		var err error
		if slowThreshold, err = time.ParseDuration(slowThresholdStr); err != nil {
			slowThreshold = 5 * time.Second
		}
	}

	var prometheusPort int
	if promPortStr := getOrDefault("PROMETHEUS_PORT", "9090"); promPortStr != "" {
		var err error
		prometheusPort, err = strconv.Atoi(promPortStr)
		if err != nil {
			prometheusPort = 9090 // Default port for Prometheus metrics
		}
	}

	var webhookWorkers int
	if webhookWorkersStr := getOrDefault("WEBHOOK_WORKERS", "4"); webhookWorkersStr != "" {
		var err error
		webhookWorkers, err = strconv.Atoi(webhookWorkersStr)
		if err != nil {
			webhookWorkers = 4
		}
	}

	var bufferCap int
	if bufferCapStr := getOrDefault("BUFFER_CAP", "2000"); bufferCapStr != "" {
		var err error
		bufferCap, err = strconv.Atoi(bufferCapStr)
		if err != nil {
			bufferCap = 2_000
		}
	}

	return Config{
		InstanceID:         mustGet("INSTANCE_ID"),
		Region:             mustGet("REGION"),
		DatabaseURL:        mustGet("DATABASE_URL"),
		RedisURL:           mustGet("REDIS_URL"),
		Port:               getOrDefault("PORT", ":8080"),
		WhatsappBaseURL:    getOrDefault("WHATSAPP_BASE_URL", "https://graph.facebook.com"),
		WhatsappAPIVersion: getOrDefault("WHATSAPP_API_VERSION", "v19.0"),
		WebhookVerifyToken: mustGet("WEBHOOK_VERIFY_TOKEN"),
		WhatsappAppSecret:  mustGet("WHATSAPP_APP_SECRET"),
		EncryptionKey:      mustGet("ENCRYPTION_KEY"),
		AdminEmail:         mustGet("ADMIN_EMAIL"),
		ResendAPIKey:       mustGet("RESEND_API_KEY"),
		ResendFromEmail:    mustGet("RESEND_FROM_EMAIL"),
		JWTIssuer:          os.Getenv("JWT_ISSUER"), // optional
		Environment:        getOrDefault("ENVIRONMENT", "production"),
		Observability: Observability{
			Tracing: &TracingConfig{
				SampleRate: sampleRate,
			},
			Logging: &LoggingConfig{
				SampleRate:    sampleRate,
				SlowThreshold: slowThreshold,
			},
			Metrics: &MetricsConfig{
				PrometheusPort: prometheusPort,
			},
		},
		Webhook: WebhookConfig{
			Workers:   webhookWorkers,
			BufferCap: bufferCap,
		},
	}
}

// mustGet returns the value of the environment variable identified by key.
// If the variable is absent or empty the error is logged and the process exits with status 1.
func mustGet(key string) string {
	v := os.Getenv(key)
	if v == "" {
		logger.Error("missing environment variable: " + key)
		os.Exit(1)
	}
	return v
}

// getOrDefault returns the value of the environment variable identified by key,
// or def when the variable is absent or empty.
func getOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
