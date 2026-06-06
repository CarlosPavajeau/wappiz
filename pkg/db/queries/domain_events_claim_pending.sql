-- name: ClaimPendingDomainEvents :many
SELECT id, tenant_id, event_type, payload, attempts, created_at
FROM domain_events
WHERE processed_at IS NULL
  AND failed_at IS NULL
  AND attempts < 5
ORDER BY created_at
LIMIT 100
FOR UPDATE SKIP LOCKED;
