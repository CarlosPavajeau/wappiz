-- name: MarkDomainEventFailed :execrows
UPDATE domain_events
SET attempts   = attempts + 1,
    claimed_at = NULL,
    claim_id    = NULL,
    last_error = sqlc.arg(last_error),
    failed_at  = CASE WHEN attempts + 1 >= 5 THEN NOW() ELSE NULL END
WHERE id = sqlc.arg(id)
  AND claim_id = sqlc.arg(claim_id)::uuid
  AND processed_at IS NULL;
