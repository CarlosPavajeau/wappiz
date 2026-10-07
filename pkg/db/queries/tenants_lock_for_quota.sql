-- name: LockTenantForQuota :one
-- Serialises quota checks for a tenant until the caller's transaction ends.
-- NO KEY UPDATE conflicts with itself but not with the KEY SHARE locks that
-- foreign-key inserts take, so unrelated writes for the tenant still proceed.
SELECT id
FROM tenants
WHERE id = $1
FOR NO KEY UPDATE;
