-- name: CountActiveResourcesByTenant :one
-- Deleted resources are soft-deleted (is_active = false) and must not use
-- up plan quota. Aggregates without GROUP BY so a tenant with no resources
-- yields 0 instead of no rows.
SELECT count(*)
FROM resources
WHERE tenant_id = $1
  AND is_active = true;
