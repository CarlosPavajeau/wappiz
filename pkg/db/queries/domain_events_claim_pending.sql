-- name: ClaimPendingDomainEvents :many
UPDATE domain_events
SET claimed_at = NOW()
WHERE id IN (
    SELECT id
    FROM domain_events
    WHERE processed_at IS NULL
      AND failed_at IS NULL
      AND (claimed_at IS NULL OR claimed_at < NOW() - INTERVAL '10 minutes')
      AND attempts < 5
    ORDER BY created_at
    LIMIT 100
    FOR UPDATE SKIP LOCKED
)
RETURNING id, tenant_id, event_type, payload, attempts, created_at;
