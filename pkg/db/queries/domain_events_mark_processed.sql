-- name: MarkDomainEventProcessed :exec
UPDATE domain_events
SET claimed_at   = NULL,
    processed_at = NOW()
WHERE id = $1;
