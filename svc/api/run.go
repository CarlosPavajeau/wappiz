package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"time"
	"wappiz/internal/events"
	"wappiz/internal/events/handlers"
	"wappiz/internal/jobs"
	"wappiz/internal/services/booking"
	"wappiz/internal/services/featureflags"
	"wappiz/internal/services/plans"
	"wappiz/internal/services/ratelimit"
	"wappiz/internal/services/slotfinder"
	"wappiz/internal/services/statemachine"
	"wappiz/internal/services/turnstile"
	"wappiz/internal/services/webhookprocessor"
	"wappiz/pkg/buildinfo"
	"wappiz/pkg/clock"
	"wappiz/pkg/counter"
	"wappiz/pkg/crypto"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"
	"wappiz/pkg/logger"
	"wappiz/pkg/mailer"
	"wappiz/pkg/otel"
	"wappiz/pkg/prometheus"
	"wappiz/pkg/prometheus/lazy"
	"wappiz/pkg/runner"
	"wappiz/pkg/server"
	"wappiz/pkg/whatsapp"
	"wappiz/svc/api/internal/middleware"
	"wappiz/svc/api/routes"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	promclient "github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/common/version"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
)

// nolint:gocognit
func Run(ctx context.Context, cfg Config) error {
	if cfg.Observability.Logging != nil {
		logger.SetSampler(logger.TailSampler{
			SlowThreshold: cfg.Observability.Logging.SlowThreshold,
			SampleRate:    cfg.Observability.Logging.SampleRate,
		})
	}

	logger.AddBaseAttrs(slog.GroupAttrs("instance",
		slog.String("id", cfg.InstanceID),
		slog.String("region", cfg.Region),
		slog.String("version", buildinfo.Version),
	))

	clk := clock.New()

	reg := promclient.NewRegistry()
	reg.MustRegister(collectors.NewGoCollector())
	//nolint:exhaustruct
	reg.MustRegister(collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}))
	lazy.SetRegistry(reg)
	buildinfo.RegisterBuildInfoMetrics("api")

	var err error
	var shutdownGrafana func(context.Context) error
	if cfg.Observability.Tracing != nil {
		shutdownGrafana, err = otel.InitGrafana(ctx, otel.Config{
			Application:        "api",
			Version:            version.Version,
			InstanceID:         cfg.InstanceID,
			CloudRegion:        cfg.Region,
			TraceSampleRate:    cfg.Observability.Tracing.SampleRate,
			PrometheusGatherer: reg,
		})

		if err != nil {
			return fmt.Errorf("unable to init grafana: %w", err)
		}
	}

	r := runner.New()
	defer r.Recover()

	r.DeferCtx(shutdownGrafana)

	database, err := db.New(db.Config{
		PrimaryDSN: cfg.DatabaseURL,
	})
	if err != nil {
		return fmt.Errorf("unable to create db: %w", err)
	}

	r.Defer(database.Close)

	if cfg.Observability.Metrics != nil {
		prom, promErr := prometheus.NewWithRegistry(reg)
		if promErr != nil {
			return fmt.Errorf("unable to start prometheus: %w", promErr)
		}

		promListener, listenErr := net.Listen("tcp", fmt.Sprintf(":%d", cfg.Observability.Metrics.PrometheusPort))
		if listenErr != nil {
			return fmt.Errorf("unable to listen on port %d: %w", cfg.Observability.Metrics.PrometheusPort, listenErr)
		}

		r.DeferCtx(prom.Shutdown)
		r.Go(func(ctx context.Context) error {
			serveErr := prom.Serve(promListener)
			if serveErr != nil && !errors.Is(serveErr, context.Canceled) {
				return fmt.Errorf("prometheus server failed: %w", serveErr)
			}
			return nil
		})
	}

	cryptoSvc, err := crypto.NewService([]byte(cfg.EncryptionKey))
	if err != nil {
		logger.Error("invalid ENCRYPTION_KEY", "err", err)
		return err
	}

	jwtVerifier := jwt.NewDBVerifier(database.Primary(), jwt.WithIssuer(cfg.JWTIssuer))

	tenantFinder := func(ctx context.Context, userID string) (uuid.UUID, error) {
		tenant, err := db.Query.FindTenantByUserId(ctx, database.Primary(), userID)
		if err != nil {
			return uuid.Nil, fmt.Errorf("failed to find tenant for user %s: %w", userID, err)
		}
		return tenant.ID, nil
	}

	mailerSvc := mailer.New(mailer.Config{
		ApiKey:    cfg.ResendAPIKey,
		FromEmail: cfg.ResendFromEmail,
	})
	waSvc := whatsapp.New(whatsapp.Config{
		BaseURL:    cfg.WhatsappBaseURL,
		ApiVersion: cfg.WhatsappAPIVersion,
	})

	dis := events.NewDispatcher()
	handlers.RegisterAll(dis, handlers.Dependencies{
		Database: database,
		Mailer:   mailerSvc,
		Whatsapp: waSvc,
		Crypto:   cryptoSvc,
	})
	pub := events.NewPublisher()

	flags, err := featureflags.New(featureflags.Config{
		APIKey:    cfg.PostHog.APIKey,
		Host:      cfg.PostHog.Host,
		SecretKey: cfg.PostHog.SecretKey,
	})
	if err != nil {
		return fmt.Errorf("unable to create feature flags service: %w", err)
	}
	r.Defer(flags.Close)

	plansSvc := plans.New(plans.Config{
		DB:          database,
		Flags:       flags,
		Environment: cfg.Environment,
	})

	slotFinder := slotfinder.New(database)
	bookingSvc := booking.New(booking.Config{
		DB:         database,
		SlotFinder: slotFinder,
		Publisher:  pub,
		Plans:      plansSvc,
	})

	turnstileSvc := turnstile.New(turnstile.Config{SecretKey: cfg.TurnstileSecretKey})

	ctr, err := counter.NewRedis(counter.RedisConfig{
		RedisURL: cfg.RedisURL,
	})

	if err != nil {
		return fault.New(fmt.Sprintf("unable to create redis counter %s", err))
	}

	rlSvc, err := ratelimit.New(ratelimit.Config{
		Clock:   clk,
		Counter: ctr,
	})

	if err != nil {
		return fmt.Errorf("unable to create ratelimit service: %w", err)
	}

	r.Defer(rlSvc.Close)

	stateMachineSvc := statemachine.New(statemachine.Config{
		DB:         database,
		Whatsapp:   waSvc,
		SlotFinder: slotFinder,
		Publisher:  pub,
		Plans:      plansSvc,
		Ratelimit:  rlSvc,
	})

	webhookProcessorSvc := webhookprocessor.New(webhookprocessor.Config{
		DB:           database,
		StateMachine: stateMachineSvc,
		Crypto:       cryptoSvc,
		Workers:      cfg.Webhook.Workers,
		BufferCap:    cfg.Webhook.BufferCap,
	})
	r.Defer(webhookProcessorSvc.Close)

	g := gin.New()

	// Gin trusts every proxy by default, letting any caller pick its own
	// ClientIP via X-Forwarded-For and dodge the per-IP rate limits.
	if err := g.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		return fmt.Errorf("invalid TRUSTED_PROXIES: %w", err)
	}
	g.TrustedPlatform = cfg.TrustedPlatform

	g.Use(
		gin.Recovery(),
		// Health probes fire every few seconds from orchestrators and monitors.
		server.WithLogging("/health/"),
		server.WithRequestID(),
		middleware.WithErrorHandling(),
		otelgin.Middleware("api"),
	)

	routes.Register(g, &routes.Services{
		Database:         database,
		JWTVerifier:      jwtVerifier,
		TenantFinder:     tenantFinder,
		Mailer:           mailerSvc,
		Whatsapp:         waSvc,
		StateMachine:     stateMachineSvc,
		SlotFinder:       slotFinder,
		Booking:          bookingSvc,
		Plans:            plansSvc,
		Turnstile:        turnstileSvc,
		Publisher:        pub,
		WebhookProcessor: webhookProcessorSvc,
		AdminEmail:       cfg.AdminEmail,
		AppSecret:        cfg.WhatsappAppSecret,
		Crypto:           cryptoSvc,
		Ratelimit:        rlSvc,
		Environment:      cfg.Environment,
	})

	reminderJob := jobs.NewReminder(jobs.ReminderConfig{
		DB:       database,
		Whatsapp: waSvc,
		Crypto:   cryptoSvc,
	})

	nowShowTrackerJob := jobs.NewNoShowTracker(jobs.NoShowTrackerConfig{
		DB:       database,
		Whatsapp: waSvc,
		Crypto:   cryptoSvc,
	})

	cleanupSessionJob := jobs.NewCleanupSessions(database)

	eventDispatcherJob := jobs.NewEventDispatcher(jobs.EventDispatcherConfig{
		DB:         database,
		ConnString: cfg.DatabaseURL,
		Dispatcher: dis,
	})

	r.Go(func(ctx context.Context) error {
		reminderJob.Run(ctx)
		return nil
	})

	r.Go(func(ctx context.Context) error {
		nowShowTrackerJob.Run(ctx)
		return nil
	})

	r.Go(func(ctx context.Context) error {
		cleanupSessionJob.Run(ctx)
		return nil
	})

	r.Go(func(ctx context.Context) error {
		eventDispatcherJob.Run(ctx)
		return nil
	})

	// Server with graceful shutdown
	srv := &http.Server{
		Handler:      g,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	r.DeferCtx(srv.Shutdown)

	r.Go(func(ctx context.Context) error {
		logger.Info("server starting", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("server failed: %w", err)
		}

		return nil
	})

	// Wait for either OS signals or context cancellation, then shutdown
	if err := r.Wait(ctx, runner.WithTimeout(time.Minute)); err != nil {
		logger.Error("Shutdown failed", "error", err)
		return fmt.Errorf("shutdown failed: %w", err)
	}

	logger.Info("API server shut down successfully")

	return nil
}
