-- name: MarkDomainEventProcessed :execrows
UPDATE domain_events
SET claimed_at   = NULL,
    claim_id     = NULL,
    processed_at = NOW()
WHERE id = sqlc.arg(id)
  AND claim_id = sqlc.arg(claim_id)::uuid;
