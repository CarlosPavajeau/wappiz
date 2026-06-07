package metrics

import (
	"wappiz/pkg/prometheus/lazy"

	"github.com/prometheus/client_golang/prometheus"
)

var (
	// EventsClaimedTotal counts domain events claimed from the outbox per poll.
	EventsClaimedTotal = lazy.NewCounter(prometheus.CounterOpts{
		Namespace: "wappiz",
		Subsystem: "events",
		Name:      "claimed_total",
		Help:      "Total number of domain events claimed from the outbox for dispatch.",
	})

	// EventsProcessedTotal counts events successfully marked as processed, by type.
	EventsProcessedTotal = lazy.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "wappiz",
			Subsystem: "events",
			Name:      "processed_total",
			Help:      "Total number of domain events successfully dispatched and marked processed.",
		},
		[]string{"event_type"},
	)

	// EventsFailedTotal counts events whose dispatch returned an error, by type.
	EventsFailedTotal = lazy.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "wappiz",
			Subsystem: "events",
			Name:      "failed_total",
			Help:      "Total number of domain events that failed dispatch.",
		},
		[]string{"event_type"},
	)

	// ListenerUp reflects whether the dedicated PostgreSQL LISTEN connection
	// is currently active (1 = connected, 0 = disconnected / reconnecting).
	ListenerUp = lazy.NewGauge(prometheus.GaugeOpts{
		Namespace: "wappiz",
		Subsystem: "events",
		Name:      "listener_up",
		Help:      "Whether the PostgreSQL LISTEN/NOTIFY connection is active (1 = up, 0 = down).",
	})
)
