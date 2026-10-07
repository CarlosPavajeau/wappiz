-- name: UpdateService :execrows
-- sort_order is not written here: no route owns service ordering yet, and
-- writing a fixed value would reset it on every edit.
-- Deleted services are excluded so an edit racing a delete cannot modify the
-- row; zero affected rows means the service is gone.
UPDATE services
SET name             = $1,
    description      = $2,
    duration_minutes = $3,
    buffer_minutes   = $4,
    price            = $5,
    is_active        = $6
WHERE id = $7
  AND tenant_id = $8
  AND deleted_at IS NULL;
