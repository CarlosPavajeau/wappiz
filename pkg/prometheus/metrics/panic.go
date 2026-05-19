package metrics

import (
	"wappiz/pkg/prometheus/lazy"

	"github.com/prometheus/client_golang/prometheus"
)

var (
	// PanicsTotal tracks panics recovered by HTTP handler middleware.
	// Use this counter to monitor application stability and identify handlers
	// that are prone to panicking.
	//
	// Labels:
	//   - "caller": The function or handler that panicked
	//   - "path": The HTTP request path that triggered the panic
	//
	// Example usage:
	//   metrics.PanicsTotal.WithLabelValues("handle", "/v1/tenants").Inc()
	PanicsTotal = lazy.NewCounterVec(prometheus.CounterOpts{
		Namespace: "wappiz",
		Subsystem: "internal",
		Name:      "panics_total",
		Help:      "Total number of panics recovered in HTTP handlers.",
	}, []string{"caller", "path"})
)
