-- name: FindServiceByID :one
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
WHERE id = $1
  AND is_active = true
  AND deleted_at IS NULL;