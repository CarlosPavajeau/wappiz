-- name: FindServiceByIDIncludingInactive :one
-- Services are soft-deleted, so an existing appointment can point at one the
-- owner has since deactivated. Use this when describing what was already
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
       created_at
FROM services
WHERE id = $1;
