package db

import (
	"context"
	"database/sql"
	"time"
	"wappiz/pkg/otel/tracing"
	"wappiz/pkg/pg/metrics"

	"go.opentelemetry.io/otel/attribute"
)

// Replica wraps a standard SQL database connection and implements the gen.DBTX interface
// to enable interaction with the generated database code.
type Replica struct {
	db   *sql.DB
	name string
}

// Ensure Replica implements the gen.DBTX interface
var _ DBTX = (*Replica)(nil)

// ExecContext executes a SQL statement and returns a result summary.
// It's used for INSERT, UPDATE, DELETE statements that don't return rows.
func (r *Replica) ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error) {
	ctx, span := tracing.Start(ctx, "ExecContext")
	defer span.End()
	span.SetAttributes(
		attribute.String("query", query),
	)

	// Track metrics
	start := time.Now()
	result, err := r.db.ExecContext(ctx, query, args...)

	// Record latency and operation count
	duration := time.Since(start).Seconds()
	status := statusSuccess
	if err != nil {
		status = statusError
	}

	metrics.DatabaseOperationsLatency.WithLabelValues(r.name, "exec", status).Observe(duration)
	metrics.DatabaseOperationsTotal.WithLabelValues(r.name, "exec", status).Inc()

	tracing.RecordErrorUnless(span, err, sql.ErrNoRows)

	return result, err
}

// PrepareContext prepares a SQL statement for later execution.
func (r *Replica) PrepareContext(ctx context.Context, query string) (*sql.Stmt, error) {
	ctx, span := tracing.Start(ctx, "PrepareContext")
	defer span.End()
	span.SetAttributes(
		attribute.String("query", query),
	)

	// Track metrics
	start := time.Now()
	stmt, err := r.db.PrepareContext(ctx, query)

	// Record latency and operation count
	duration := time.Since(start).Seconds()
	status := statusSuccess
	if err != nil {
		status = statusError
	}

	metrics.DatabaseOperationsLatency.WithLabelValues(r.name, "prepare", status).Observe(duration)
	metrics.DatabaseOperationsTotal.WithLabelValues(r.name, "prepare", status).Inc()

	tracing.RecordErrorUnless(span, err, sql.ErrNoRows)

	return stmt, err
}

// QueryContext executes a SQL query that returns rows.
func (r *Replica) QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	ctx, span := tracing.Start(ctx, "QueryContext")
	defer span.End()
	span.SetAttributes(
		attribute.String("query", query),
	)

	// Track metrics
	start := time.Now()
	rows, err := r.db.QueryContext(ctx, query, args...)

	// Record latency and operation count
	duration := time.Since(start).Seconds()
	status := statusSuccess
	if err != nil {
		status = statusError
	}

	metrics.DatabaseOperationsLatency.WithLabelValues(r.name, "query", status).Observe(duration)
	metrics.DatabaseOperationsTotal.WithLabelValues(r.name, "query", status).Inc()

	tracing.RecordErrorUnless(span, err, sql.ErrNoRows)

	return rows, err
}

// QueryRowContext executes a SQL query that returns a single row.
func (r *Replica) QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row {
	ctx, span := tracing.Start(ctx, "QueryRowContext")
	defer span.End()
	span.SetAttributes(
		attribute.String("query", query),
	)

	// Track metrics
	start := time.Now()
	row := r.db.QueryRowContext(ctx, query, args...)

	// Record latency and operation count
	duration := time.Since(start).Seconds()
	// QueryRowContext doesn't return an error, but we can still track timing
	status := statusSuccess

	metrics.DatabaseOperationsLatency.WithLabelValues(r.name, "query_row", status).Observe(duration)
	metrics.DatabaseOperationsTotal.WithLabelValues(r.name, "query_row", status).Inc()

	return row
}

// Begin starts a transaction and returns it.
// This method provides a way to use the Replica in transaction-based operations.
func (r *Replica) Begin(ctx context.Context) (DBTx, error) {
	ctx, span := tracing.Start(ctx, "Begin")
	defer span.End()

	// Track metrics
	start := time.Now()
	tx, err := r.db.BeginTx(ctx, nil)

	// Record latency and operation count
	duration := time.Since(start).Seconds()
	status := statusSuccess
	if err != nil {
		status = statusError
	}

	metrics.DatabaseOperationsLatency.WithLabelValues(r.name, "begin", status).Observe(duration)
	metrics.DatabaseOperationsTotal.WithLabelValues(r.name, "begin", status).Inc()

	tracing.RecordErrorUnless(span, err, sql.ErrNoRows)

	if err != nil {
		return nil, err
	}

	// Wrap the transaction with tracing
	return WrapTxWithContext(tx, r.name+"_tx", ctx), nil
}
