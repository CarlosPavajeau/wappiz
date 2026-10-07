// Package featureflags evaluates PostHog feature flags per tenant.
//
// Flags gate features that are not ready for every tenant. Evaluation fails
// closed: a missing API key or an unreachable PostHog reports every flag as
// disabled, so an outage can never switch on behaviour nobody released.
package featureflags

import (
	"context"
	"time"
	"wappiz/pkg/logger"

	"github.com/google/uuid"
	"github.com/posthog/posthog-go"
)

// flagRequestTimeout bounds remote evaluation; flags sit on request paths
// such as booking an appointment, which must not stall on PostHog.
const flagRequestTimeout = 2 * time.Second

// Flag is a PostHog feature flag key.
type Flag string

// Billing gates paid plans: plan limits and the billing UI.
const Billing Flag = "billing"

// Service reports whether a flag is enabled for a tenant. Callers depend on
// the interface so tests can substitute a fake.
type Service interface {
	IsEnabled(ctx context.Context, flag Flag, tenantID uuid.UUID) bool
	Close() error
}

type Config struct {
	// APIKey is the PostHog project API key. Empty disables every flag.
	APIKey string
	// Host is the PostHog API host. Empty uses the SDK default.
	Host string
	// SecretKey enables local evaluation, so checks avoid a network round trip
	// per call. Optional.
	SecretKey string
}

// New returns a PostHog-backed Service, or one that reports every flag as
// disabled when no API key is configured.
func New(cfg Config) (Service, error) {
	if cfg.APIKey == "" {
		return disabled{}, nil
	}

	client, err := posthog.NewWithConfig(cfg.APIKey, posthog.Config{
		Endpoint:                  cfg.Host,
		SecretKey:                 cfg.SecretKey,
		FeatureFlagRequestTimeout: flagRequestTimeout,
	})
	if err != nil {
		return nil, err
	}

	return &service{client: client}, nil
}

type service struct {
	client posthog.Client
}

func (s *service) IsEnabled(_ context.Context, flag Flag, tenantID uuid.UUID) bool {
	value, err := s.client.IsFeatureEnabled(posthog.FeatureFlagPayload{
		Key:        string(flag),
		DistinctId: tenantID.String(),
	})
	if err != nil {
		logger.Warn("[featureflags] flag evaluation failed, treating as disabled",
			"flag", string(flag),
			"tenant_id", tenantID,
			"err", err)
		return false
	}

	enabled, ok := value.(bool)
	return ok && enabled
}

func (s *service) Close() error {
	return s.client.Close()
}

type disabled struct{}

func (disabled) IsEnabled(context.Context, Flag, uuid.UUID) bool { return false }
func (disabled) Close() error                                    { return nil }
