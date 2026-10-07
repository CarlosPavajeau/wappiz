-- name: FindServiceByIDIncludingInactive :one
-- An existing appointment can point at a service the owner has since paused
-- or deleted, so this returns both. Use this when describing what was already
-- booked; use FindServiceByID when the service must still be bookable.
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
WHERE id = $1;
