-- name: FindServicesByTenantID :many
SELECT id,
       tenant_id,
       name,
       description,
       duration_minutes,
       buffer_minutes,
       price,
       is_active,
       sort_order,
       created_at,
       deleted_at
FROM services
WHERE tenant_id = $1
  AND deleted_at IS NULL
ORDER BY created_at;
