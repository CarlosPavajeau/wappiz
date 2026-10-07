-- name: CountResourcesByTenant :one
-- Aggregates without GROUP BY so a tenant with no resources yields 0
-- instead of no rows.
SELECT count(*)
FROM resources
WHERE tenant_id = $1;
