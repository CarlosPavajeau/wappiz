-- name: DeleteResource :execrows
-- Zero affected rows means the resource does not exist, belongs to another
-- tenant or is already deleted.
UPDATE resources
SET deleted_at = now()
WHERE id = $1
  AND tenant_id = $2
  AND deleted_at IS NULL;
