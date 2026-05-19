package api

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"time"
	"wappiz/internal/jobs/cleanup_sessions_job"
	"wappiz/internal/jobs/no_show_tracker_job"
	"wappiz/internal/jobs/reminder_job"
	"wappiz/internal/services/ratelimit"
	"wappiz/internal/services/slot_finder"
	"wappiz/internal/services/state_machine"
	"wappiz/internal/services/webhook_processor"
	"wappiz/pkg/clock"
	"wappiz/pkg/counter"
	"wappiz/pkg/crypto"
	"wappiz/pkg/db"
	"wappiz/pkg/jwt"
	"wappiz/pkg/logger"
	"wappiz/pkg/mailer"
	"wappiz/pkg/otel"
	"wappiz/pkg/prometheus"
	"wappiz/pkg/prometheus/lazy"
	"wappiz/pkg/runner"
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

	clk := clock.New()

	reg := promclient.NewRegistry()
	reg.MustRegister(collectors.NewGoCollector())
	//nolint:exhaustruct
	reg.MustRegister(collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}))
	lazy.SetRegistry(reg)

	var err error
	var shutdownGrafana func(context.Context) error
	if cfg.Observability.Tracing != nil {
		shutdownGrafana, err = otel.InitGrafana(ctx, otel.Config{
			Application:     "api",
			Version:         version.Version,
			InstanceID:      cfg.InstanceID,
			CloudRegion:     cfg.Region,
			TraceSampleRate: cfg.Observability.Tracing.SampleRate,
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

	jwt.Init(database.Primary(), cfg.JWTIssuer)

	jwt.InitTenantFinder(func(ctx context.Context, userID string) (uuid.UUID, error) {
		tenant, err := db.Query.FindTenantByUserId(ctx, database.Primary(), userID)
		if err != nil {
			return uuid.Nil, fmt.Errorf("failed to find tenant for user %s: %w", userID, err)
		}
		return tenant.ID, nil
	})

	mailerSvc := mailer.New(mailer.Config{
		ApiKey:    cfg.ResendAPIKey,
		FromEmail: cfg.ResendFromEmail,
	})
	waSvc := whatsapp.New(whatsapp.Config{
		BaseURL:    cfg.WhatsappBaseURL,
		ApiVersion: cfg.WhatsappAPIVersion,
	})
	slotFinder := slot_finder.New(database)
	stateMachineSvc := state_machine.New(state_machine.Config{
		DB:          database,
		Whatsapp:    waSvc,
		SlotFinder:  slotFinder,
		Environment: cfg.Environment,
	})

	ctr := counter.NewMemoryCounter(clk)
	rlSvc, err := ratelimit.New(ratelimit.Config{
		Clock:   clk,
		Counter: ctr,
	})

	if err != nil {
		return fmt.Errorf("unable to create ratelimit service: %w", err)
	}

	r.Defer(rlSvc.Close)

	webhookProcessorSvc := webhook_processor.New(webhook_processor.Config{
		DB:           database,
		StateMachine: stateMachineSvc,
		Crypto:       cryptoSvc,
		Workers:      cfg.Webhook.Workers,
		BufferCap:    cfg.Webhook.BufferCap,
	})
	r.Defer(webhookProcessorSvc.Close)

	g := gin.New()

	g.Use(
		gin.Recovery(),
		middleware.WithLogging(),
		middleware.WithRequestID(),
		middleware.WithErrorHandling(),
		otelgin.Middleware("api"),
	)

	routes.Register(g, &routes.Services{
		Database:         database,
		Mailer:           mailerSvc,
		Whatsapp:         waSvc,
		StateMachine:     stateMachineSvc,
		WebhookProcessor: webhookProcessorSvc,
		AdminEmail:       cfg.AdminEmail,
		AppSecret:        cfg.WhatsappAppSecret,
		Crypto:           cryptoSvc,
		Ratelimit:        rlSvc,
		Environment:      cfg.Environment,
	})

	reminderJob := reminder_job.New(reminder_job.Config{
		DB:       database,
		Whatsapp: waSvc,
		Crypto:   cryptoSvc,
	})

	nowShowTrackerJob := no_show_tracker_job.New(no_show_tracker_job.Config{
		DB:       database,
		Whatsapp: waSvc,
		Crypto:   cryptoSvc,
	})

	cleanupSessionJob := cleanup_sessions_job.New(database)

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
