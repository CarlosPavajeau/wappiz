-- name: MarkDomainEventFailed :exec
UPDATE domain_events
SET attempts   = attempts + 1,
    claimed_at = NULL,
    last_error = $2,
    failed_at  = CASE WHEN attempts + 1 >= 5 THEN NOW() ELSE NULL END
WHERE id = $1
  AND processed_at IS NULL;
