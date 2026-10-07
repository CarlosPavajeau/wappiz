-- name: CountResourcesByTenant :one
-- Deleted resources must not use up plan quota. Inactive ones still do:
-- is_active only pauses scheduling, and toggling it must not free a slot.
-- Aggregates without GROUP BY so a tenant with no resources yields 0
-- instead of no rows.
SELECT count(*)
FROM resources
WHERE tenant_id = $1
  AND deleted_at IS NULL;
