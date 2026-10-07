-- name: UpdateResource :execrows
-- sort_order is owned by the resources_update_sort_order route; writing it
-- here would reset the order whenever a client edits the resource details.
-- Deleted resources are excluded so an edit racing a delete cannot revive
-- the row; zero affected rows means the resource is gone.
UPDATE resources
SET name       = $1,
    type       = $2,
    avatar_url = $3,
    is_active  = $4
WHERE id = $5
  AND tenant_id = $6
  AND deleted_at IS NULL;
