-- name: MarkDomainEventProcessed :exec
UPDATE domain_events
SET processed_at = NOW()
WHERE id = $1;
